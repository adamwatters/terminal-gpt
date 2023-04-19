const { Configuration, OpenAIApi } = require("openai");
const { systemPrompt } = require("./systemPrompt.js");
const { makeDebounced } = require("./helpers.js");

const AI = (apiKey, terminal, send) => {
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);
  const conversation = [];

  const debouncedUpdateGPT = makeDebounced((data) => {
    console.log("sending to gpt");
    console.log(data);
  }, 1000);

  terminal.onData((data) => {
    debouncedUpdateGPT(data);
    // PROBLEM: things like installing dependencies make a ton of data updates. maybe this is as simple as debouncing.
    // send to gpt
  });

  async function generate() {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      frequency_penalty: 1,
      max_tokens: 256,
      presence_penalty: 1,
      stream: false,
      temperature: 0.8,
      top_p: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...conversation],
    });
    return completion;
  }

  return {
    apiKey: apiKey,
    prompt: async (input) => {
      if (!input || input.trim().length === 0) {
        return "Please enter a valid message";
      }
      conversation.push({ role: "user", content: input });
      try {
        const completion = await generate();
        let newAnswer = completion.data.choices[0].message;
        const patternToMatchApiCalls = /\[\[.*?\]\]/g;
        const calls = newAnswer.content.match(patternToMatchApiCalls);
        if (calls) {
          terminal.write(`${calls[0].substring(2, calls[0].length - 2)} \n`);
        }
        const sanitizedAnswer = newAnswer.content.replace(
          patternToMatchApiCalls,
          ""
        );
        send(sanitizedAnswer);
        return sanitizedAnswer;
        // update the conversation in firebase
      } catch (error) {
        // Consider adjusting the error handling logic for your use case
        if (error.response) {
          console.error(
            `Error with OpenAI API request 1: ${JSON.stringify(
              error.response.data
            )}`
          );
          return "something went wrong";
        } else {
          console.error(`Error with OpenAI API request 2: ${error.message}`);
          return "something went wrong";
        }
      }
    },
  };
};

module.exports = {
  AI,
};
