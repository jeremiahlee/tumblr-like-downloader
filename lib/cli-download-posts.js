const fs = require('fs');
const fsPromises = fs.promises;
const tumblr = require('tumblr.js');

let tumblrApiConfig = JSON.parse(fs.readFileSync(`./tumblr-api-config.json`, 'utf8'));

let client = tumblr.createClient({
    credentials: tumblrApiConfig,
    returnPromises: true,
});

async function getPosts(blogName, params) {
    console.log(`Retrieving posts before: ${new Date(Number(params.before) * 1000)} (${params})`);

    let response = await client.blogPosts(blogName, params);

    return {
        response: response,
        params: params
    };
}

async function save(responseAndTimestamp) {
    let {response, params} = responseAndTimestamp;

    // Save the raw API response for posterity
    await fsPromises.writeFile(`./posts-api-raw/page-${params.page_number}.json`, JSON.stringify(response), 'utf8');

    // Save individual likes
    console.log(`${response.posts.length} more posts retrieved.`);
    for (let post of response.posts) {
        await fsPromises.writeFile(`./posts-json/${post.id}.json`, JSON.stringify(post), 'utf8');
    }

    return response._links;
}

async function processTimestamp(blogName, params) {
    getPosts(blogName, params)
    .then(save)
    .then(function(links) {
        console.log(links);
        if (links && links.hasOwnProperty('next')) {
            // Recursive, so use setImmediate to break the call stack.
            setImmediate(processTimestamp, blogName, links.next.query_params);
        } else {
            console.log('DONE: list of posts downloaded.\n');

            console.log(`The next step is to download the images and video media from Tumblr.`);
            // TODO: Implement downloader
            // console.log(`Run this command next:`);
            // console.log(`npm run get-likes-media`);
        }

        return;
    })
    .catch(function(err) {
        console.log(err);
    });
}

processTimestamp(process.argv[2], {
    before: Math.floor(Date.now() / 1000),
    limit: '20',
    offset: '0',
    page_number: '0'
})
