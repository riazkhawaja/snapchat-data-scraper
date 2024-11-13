import * as cheerio from "cheerio";
import fs from "fs";
import { writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { v4 as uuidv4 } from 'uuid';

(async () => {
    await getSharedStoryVideoLinks();

    await downloadSharedStoryVideos();
})();

async function getSharedStoryVideoLinks() {
    // add path to your shared_story.json
    let links = JSON.parse(fs.readFileSync('./shared_story.json', 'utf-8'))["Spotlight History"].map(record => record["Story URL"]);
    const all_video_links = [];

    console.log(`Total number of shared stories: ${links.length}`);
    const chunkSize = 10;
    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);

        let video_links = await Promise.all(
            chunk.map(
                link => {
                    return new Promise((resolve, reject) => {
                        fetch(link).then(async res => {
                            let body = await res.text();
                            let $ = cheerio.load(body);
                            resolve($($("video").children()[0]).attr('src'));
                        });
                    });
                }
            )
        )

        console.log(`Fetched ${chunk.length} shared story video links(s).`);
        video_links.filter(link => !!link);

        all_video_links.push(video_links);

        fs.appendFileSync('./video_links.txt', video_links.join("\n"));
        console.log(`Wrote ${video_links.length} shared story video links(s) to video_links.txt.`);

        await new Promise((resolve) => {
            setTimeout(() => {
                console.log("1 second delay...");
                resolve();
            }, 1000)
        });
    }
}

async function downloadSharedStoryVideos() {
    let links = fs.readFileSync('./video_links.txt', 'utf-8').split(/\r?\n/).filter(link => !!link);

    console.log(`Total number of shared story video links: ${links.length}`);

    const chunkSize = 100;
    for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);

        await Promise.all(
            chunk.map(
                link => {
                    return new Promise((resolve, reject) => {
                        fetch(link).then(async res => {
                            const stream = Readable.fromWeb(res.body)
                            await writeFile(`./shared_stories/${uuidv4()}.mp4`, stream);
                            resolve();
                        });
                    });
                }
            )
        )

        console.log(`Downloaded ${chunk.length} shared story video links(s) to shared_stories.`);

        await new Promise((resolve) => {
            setTimeout(() => {
                console.log("1 second delay...");
                resolve();
            }, 1000)
        });
    }
}
