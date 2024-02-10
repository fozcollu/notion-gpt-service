const express = require('express');
const axios = require('axios');
const app = express();
const port = 4000;

// Configuration
const NOTION_TOKEN = 'secret_u0SoCHFxWY7If76NpPmt3sCyQrxPV8BSRLez8nNDtDR';
const NOTION_VERSION = '2021-08-16';


const headers = {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION
};


async function searchPage(pageName) {
    const searchResponse = await axios.post('https://api.notion.com/v1/search', {
        query: pageName,
        filter: { property: 'object', value: 'page' },
        page_size: 10
    }, { headers });

    return searchResponse.data.results;
}

//create page
async function createPage(pageName, parentPageId) {

    const body = {
        parent: { page_id: parentPageId },
        properties: {
            title: {
                title: [{
                    text: {
                        content: pageName
                    }
                }]
            }
        },
        children: [
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    text: [{
                        type: 'text',
                        text: {
                            content: ""
                        }
                    }]
                }
            }
        ]
    };

    const response = await axios.post('https://api.notion.com/v1/pages', body, { headers });
    console.log('Page created successfully:', response.data);
    return response.data.id;
}

async function getPage(pageName = "Draft", parentPageName = "NotionGPT") {

    //searching parent page
    var parentPages = await searchPage(parentPageName);

    if (!parentPages || parentPages.length == 0) {
        //create default parent-page
        throw new Error("üst sayfa bulunamadı");
    }

    if (parentPages.length != 1) {
        throw new Error("Aynı ada sahip birden fazla üst sayfa var");
    }

    var parentPageId = parentPages[0].id;

    //searching sub page

    var pages = await searchPage(pageName);

    pages = pages.filter(x => x.parent.page_id == parentPageId)

    var pageId;

    // return error if there is more than one page with same pageName
    if (pages.length > 1) {
        throw new Error("Üst sayfa içinde birden aynı ada sahip birden fazla sayfa var");
    }

    if (pages.length == 1) {
        pageId = pages[0].id;
    }

    if (!pages || pages.length == 0) {
        pageId = await createPage(pageName, parentPageId);
    }

    return pageId;


}

async function addContent(pageId, content, header) {
    const appendUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
    header = header ?? new Date().toLocaleDateString();
    const appendData = {
        children: [
            {
                object: "block",
                type: "heading_2",
                heading_2: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: header
                            }
                        }
                    ]
                }
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    text: [
                        {
                            type: 'text',
                            text: {
                                content: content
                            }
                        }
                    ]
                }
            }
        ]
    };
    await axios.patch(appendUrl, appendData, { headers });
    console.log("Content appended successfully.");
}

async function takeNote(pageName, content, header, parentPageName) {

    const pageId = await getPage(pageName, parentPageName);

    if (!pageId) throw new Error("Sayfa yaratılamadı.")

    await addContent(pageId, content, header);
}

app.get('/', (req, res) => {
    res.send('Hey this is my API running 🥳')
})

app.use(express.json()); // Middleware to parse JSON bodies

// Assuming the previous setup and functions (findParentPageId, findOrCreatePage, appendContentToPage) are defined here

app.post('/takeNote', async (req, res) => {
    const { pageName, content, header, parentPageName } = req.body;

    try {
        await takeNote(pageName, content, header, parentPageName);
        res.json({ message: "Not alındı." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/getPage', async (req, res) => {
    const { pageName, parentPageName } = req.body;

    try {
        var page = await getPage(pageName, parentPageName);
        res.json({ pageId: page });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app