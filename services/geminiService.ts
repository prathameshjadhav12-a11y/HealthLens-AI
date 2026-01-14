
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GroundingSource, DoctorSearchResult, MapSource } from "../types";

export const analyzeSymptoms = async (
  symptoms: string, 
  imageBase64: string | null = null,
  language: string = 'English',
  imageMimeType: string = 'image/jpeg'
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-flash-preview for both text and multimodal (image) input.
  const modelName = 'gemini-3-flash-preview';

  const prompt = `
    Act as a highly experienced medical information assistant. 
    Analyze the provided symptoms ${imageBase64 ? 'and the attached medical image/photo' : ''}.
    
    LANGUAGE REQUIREMENT:
    You MUST output the entire response in ${language}.

    OUTPUT FORMAT REQUIREMENT:
    The very first line of your response MUST be strictly in this format:
    CONFIDENCE_SCORE: [0-100] | CONFIDENCE_LABEL: [High/Medium/Low]
    
    (Example: CONFIDENCE_SCORE: 85 | CONFIDENCE_LABEL: High)

    After the confidence line, provide a structured markdown analysis:
    1. **Summary**: Interpret the symptoms ${imageBase64 ? 'and visual signs' : ''}.
    2. **Potential Conditions**: List possibilities (emphasize these are not diagnoses).
    3. **Urgency**: Rated Low, Medium, High, or Emergency.
    4. **Recommendations**: Immediate next steps (e.g., ER, GP, self-care).
    
    Calculated Confidence Logic:
    - High (80-100%): Symptoms are specific, detailed, and clear ${imageBase64 ? 'or image is very clear' : ''}.
    - Medium (50-79%): Symptoms are common but could mean multiple things.
    - Low (0-49%): Vague symptoms or insufficient information.

    DISCLAIMER:
    Include a prominent disclaimer that this is AI-generated and not a medical diagnosis.
    
    Symptoms provided: "${symptoms}"
  `;

  const requestParts: any[] = [];
  
  if (imageBase64) {
    requestParts.push({
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType, 
      },
    });
  }
  
  requestParts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: requestParts },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const fullText = response.text || "Unable to generate analysis. Please try again.";
    
    // Parse Confidence Score
    let confidence = { score: 0, label: "Low" };
    let content = fullText;

    const lines = fullText.split('\n');
    const firstLine = lines[0].trim();

    if (firstLine.includes('CONFIDENCE_SCORE:')) {
      try {
        const scoreMatch = firstLine.match(/CONFIDENCE_SCORE:\s*(\d+)/);
        const labelMatch = firstLine.match(/CONFIDENCE_LABEL:\s*(\w+)/);
        
        if (scoreMatch && labelMatch) {
          confidence = {
            score: parseInt(scoreMatch[1], 10),
            label: labelMatch[1]
          };
          // Remove the metadata line from the content to be displayed
          content = lines.slice(1).join('\n').trim();
        }
      } catch (e) {
        console.warn("Failed to parse confidence score", e);
      }
    }

    // Extract grounding chunks for sources
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    return {
      content,
      confidence,
      language,
      sources
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze symptoms. Please check your connection or try a different image.");
  }
};

export const findNearbyDoctors = async (symptoms: string, lat: number, lng: number): Promise<DoctorSearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Simplified and direct prompt to ensure Google Maps tool usage
  const prompt = `
    Use Google Maps to find medical help near the location: ${lat}, ${lng}.
    
    Context: Patient has "${symptoms}".
    
    1. Determine the specialist needed (e.g. Urgent Care, Dermatologist, Cardiologist).
    2. Search for 3-4 top-rated places of that type nearby.
    3. Return the results as a list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    const text = response.text || "Could not find specific doctor information.";
    
    const mapSources: MapSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.maps && chunk.maps.uri && chunk.maps.title) {
          mapSources.push({
            title: chunk.maps.title,
            uri: chunk.maps.uri,
            address: chunk.maps.address 
          });
        }
        else if (chunk.web && chunk.web.uri && chunk.web.title) {
           mapSources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    return {
      content: text,
      mapSources: mapSources
    };

  } catch (error) {
    console.error("Gemini Doctor Search Error:", error);
    throw new Error("Failed to locate nearby doctors. Please ensure location services are enabled in your browser.");
  }
};
