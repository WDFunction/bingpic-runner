require('dotenv').config()

const axios = require('axios')
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

const zero = (v) => v.toString().padStart(2, '0')

async function downloadImage(url) {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer'
    })

    return Buffer.from(response.data, 'binary')
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
        let fileBuf= await downloadImage(`https://bing.com${remoteUrl}`)

        let date = new Date();
        let filename = `${date.getFullYear()}/${zero(date.getMonth()+1)}/${zero(date.getDate())}`+ ".jpeg"
        await client.put(filename, fileBuf)
        console.log('upload image success')
        await client.put('latestUrl.txt', Buffer.from(remoteUrl))
        console.log('upload data success')
        await client.put('latestFilename.txt', Buffer.from(filename))
        console.log('upload filename success')
        await client.copy('latest.jpeg', filename)
    } else {
        console.log('dont need to update')
    }
}

start()