const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Configuration
const NOTION_TOKEN = 'secret_u0SoCHFxWY7If76NpPmt3sCyQrxPV8BSRLez8nNDtDR';
const NOTION_VERSION = '2021-08-16';


const headers = {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION
};

async function findParentPageId(parentPageName) {
    const searchResponse = await axios.post('https://api.notion.com/v1/search', {
        query: parentPageName,
        filter: { property: 'object', value: 'page' },
        page_size: 1
    }, { headers });

    if (searchResponse.data.results.length > 0) {
        return searchResponse.data.results[0].id;
    } else {
        return null;
    }
}

async function findOrCreatePage(pageName, parentPageId = null) {
    const searchResponse = await axios.post('https://api.notion.com/v1/search', {
        query: pageName,
        filter: { property: 'object', value: 'page' },
        page_size: 100
    }, { headers });

    let page = searchResponse.data.results.find(result => result.properties?.title?.title[0]?.plain_text === pageName);

    if (page) {
        console.log(`Page "${pageName}" found with ID: ${page.id}`);
        return page.id;
    } else {
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
    
        try {
            const response = await axios.post('https://api.notion.com/v1/pages', body, { headers });
            console.log('Page created successfully:', response.data);
            return response.data.id;
        } catch (error) {
            console.error('Failed to create page:', error.response ? error.response.data : error.message);
            return null;
        }
       
    }
}

async function appendContentToPage(pageId, content) {
    const appendUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
    const appendData = {
        children: [
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

async function takeNote(pageName, content, parentPageName = null) {
    let parentPageId = null;
    if (parentPageName) {
        parentPageId = await findParentPageId(parentPageName);
    }
    const pageId = await findOrCreatePage(pageName, parentPageId);
    await appendContentToPage(pageId, content);
}


app.use(express.json()); // Middleware to parse JSON bodies

// Assuming the previous setup and functions (findParentPageId, findOrCreatePage, appendContentToPage) are defined here

app.post('/takeNote', async (req, res) => {
    const { pageName, content, parentPageName } = req.body;

    try {
        await takeNote(pageName, content, parentPageName);
        res.json({ message: 'Note taken successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to take note.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});