require('dotenv').config()

const axios = require('axios')
const moment = require('moment')
const os = require('os')
const OSS = require('ali-oss');
const fs = require('fs')
const { KEY, SECRET } = process.env

const client = new OSS({
    region: 'oss-cn-shanghai',
    accessKeyId: KEY,
    accessKeySecret: SECRET,
    bucket: 'bingpic-wdljt'
});

async function downloadImage(url) {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    })

    let fileType = response.headers['content-type'].split('/')[1]
    let localFilename = `${os.tmpdir()}/${new Date().valueOf()}.${fileType}`;

    response.data.pipe(fs.createWriteStream(localFilename))

    return new Promise((resolve, reject) => {
        response.data.on('end', () => {
            resolve({ fileType, localFilename })
        })

        response.data.on('error', () => {
            reject()
        })
    })
}

async function start() {
    let latestUrl = ""
    try {
        await client.get('latestUrl.txt', `${os.tmpdir()}/latestUrl.txt`)
        latestUrl = fs.readFileSync(`${os.tmpdir()}/latestUrl.txt`).toString()
        console.log('latest', latestUrl)
    } catch (e) { console.log('latestUrl file not found'); console.log(e) }
    let r = await axios('https://bing.com/HPImageArchive.aspx?format=js&idx=0&n=1')
    let remoteUrl = r.data.images[0].url
    console.log('remote', remoteUrl)
    if (latestUrl !== remoteUrl) {
        console.log('need fetch')
        let { fileType, localFilename } = await downloadImage(`https://bing.com${remoteUrl}`)
        console.log(fileType, localFilename)

        let date = new Date();
        let filename = moment(date).format("YYYY/MM/DD") + "." + fileType
        client.put(filename, localFilename).then(res => {
            console.log('upload image success')
            fs.writeFileSync(`${os.tmpdir()}/latestUrl.txt`, remoteUrl)
            client.put('latestUrl.txt', `${os.tmpdir()}/latestUrl.txt`).then(res => {
                console.log('upload data success')
                fs.writeFileSync(`${os.tmpdir()}/latestFilename.txt`, filename)
                client.put('latestFilename.txt', `${os.tmpdir()}/latestFilename.txt`).then(res => {
                    console.log('upload filename success')
                })
            })

        })
    } else {
        console.log('dont need to update')
    }
}

exports.pubSubEntry = (event, context) => {
    start();
}