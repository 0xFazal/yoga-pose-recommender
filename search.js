import { 
    Firestore,
    FieldValue,
} from '@google-cloud/firestore';
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import { config } from "dotenv";

config();

// Configure logging (you might want a more advanced logging setup)
const log = {
  info: (message) => console.log(`${new Date().toISOString()} - INFO - ${message}`),
  error: (message) => console.error(`${new Date().toISOString()} - ERROR - ${message}`),
};

async function search(query) {
  try {

    const embeddings = new VertexAIEmbeddings({
        model: process.env.EMBEDDING_MODEL_NAME,
      });
    
    // Initialize Firestore
    const firestore = new Firestore({
        projectId: process.env.PROJECT_ID,
        databaseId: process.env.DATABASE,
    });

    log.info(`Now executing query: ${query}`);
    const singleVector = await embeddings.embedQuery(query);
    const collectionRef = firestore.collection(process.env.COLLECTION);
    let vectorQuery = collectionRef.findNearest(
    "embedding",
    FieldValue.vector(singleVector), // a vector with 768 dimensions
    {
        limit: process.env.TOP_K,
        distanceMeasure: "COSINE",
    }
    );
    const vectorQuerySnapshot = await vectorQuery.get();

    const results = [];
    for (const result of vectorQuerySnapshot.docs) {
        results.push({ name: result.data().metadata.name, description: result.data().metadata.description, expertise_level: result.data().metadata.expertise_level, photo_url : result.data().metadata.photo_url, pose_type : result.data().metadata.pose_type });
    };
    console.info(results);
    return results;
  } catch (error) {
    log.error(`Error during search: ${error.message}`);
    throw error
  }
}

export default search