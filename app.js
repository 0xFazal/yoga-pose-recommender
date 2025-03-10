import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import textToSpeech from "@google-cloud/text-to-speech";
import search from './search.js';

const client = new textToSpeech.TextToSpeechClient();

async function textToWav(voiceName, text) {
  const languageCode = voiceName.split("-").slice(0, 2).join("-");
  const request = {
    input: { text: text },
    voice: { languageCode: languageCode, name: voiceName },
    audioConfig: { audioEncoding: "LINEAR16" },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Get directory path

const app = express();
const port = 8080;

// Serve static files from the 'views' directory
app.use(express.static(path.join(__dirname, 'views'))); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    let results = null;  // Initialize results
    let error = null;     // Initialize error

    res.render('index', { results, error });
});

app.post('/search', async (req, res) => {
    // Parse the prompt from the JSON request body
    let prompt;
    try {
        prompt = req.body.prompt; //If you send a JSON object like { "prompt": "my prompt"}
        if (!prompt) {
          return res.status(400).send('Missing prompt in request body');
        }
    } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return res.status(400).send('Invalid JSON in request body');
    }

    console.info("Received request to search");
    console.info(prompt);
    
    let results = null;  // Initialize results
    let error = null;     // Initialize error

    try {
        results = await search(prompt);
    } catch (err) {
        error = err.message;
        console.error("Error searching:", err);
    }
    finally {
        res.json({ results, error }); 
    }
});


app.post("/generate_audio", async (req, res) => {
    const description = req.body.description;
    if (!description) {
      return res.status(400).json({ error: "Missing description" });
    }
  
    try {
      const decodedDescription = decodeURIComponent(description);
      const voiceName = "en-US-Wavenet-D"; // Or your preferred voice
      const audioContent = await textToWav(voiceName, decodedDescription);
  
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=audio.wav"
      );
      res.send(audioContent);
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ error: error.message });
    }
  });

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
