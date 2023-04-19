const { Configuration, OpenAIApi } = require("openai");
const { systemPrompt } = require("./systemPrompt.js");

const AI = (apiKey, terminal, send) => {
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);
  const conversation = [{ role: "system", content: systemPrompt }];

  async function generate() {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      frequency_penalty: 1,
      max_tokens: 1000,
      presence_penalty: 1,
      stream: false,
      temperature: 0.8,
      top_p: 0.7,
      messages: conversation,
    });
    return completion;
  }

  async function gpt() {
    try {
      console.log(conversation);
      const completion = await generate();
      let newAnswer = completion.data.choices[0].message;
      const patternToMatchApiCalls = /\[\[.*?\]\]/g;
      const calls = newAnswer.content.match(patternToMatchApiCalls);
      conversation.push(newAnswer);
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
  }

  // some operations, like scrolling a man page or installing dependencies, fire a bunch of terminal.onData events
  // for now, we're just debouncing and using the last 5 events max. maybe could remove redundant updates in the future
  const debouncedUpdateGPT = (() => {
    let timerId;
    let dataUpdates = [];
    return function (data) {
      dataUpdates.push(data);
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        let terminalUpdate;
        if (dataUpdates.length > 5) {
          terminalUpdate = dataUpdates.slice(-5).join("");
        } else {
          terminalUpdate = dataUpdates.join("");
        }
        const wrappedTerminalUpdate = `
        terminal output:
        ${terminalUpdate}
        `;

        // reset the debounce
        dataUpdates = [];
        timerId = null;

        conversation.push({
          role: "user",
          content: wrappedTerminalUpdate,
        });
        gpt();
      }, 1000);
    };
  })();

  terminal.onData((data) => {
    debouncedUpdateGPT(data);
  });

  return {
    apiKey: apiKey,
    prompt: async (input) => {
      if (!input || input.trim().length === 0) {
        return "Please enter a valid message";
      }
      conversation.push({ role: "user", content: input });
      return await gpt();
    },
  };
};

module.exports = {
  AI,
};
