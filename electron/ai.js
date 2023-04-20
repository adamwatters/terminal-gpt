const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");

const { systemPrompt } = require("./systemPrompt.js");
const { callFromString } = require("./callFromString.js");

// i forget how to write js... so I'm doing this closure thing for now
let activeTerminal;

const AI = (apiKey, terminal, send) => {
  activeTerminal = terminal;

  // add a listener to the terminal to update the GPT. if we change the terminal we'll leave this in place for now.
  // ai will only be able to write to the last terminal added
  terminal.onData((data) => {
    debouncedUpdateGPT(data);
  });

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

  const specialFunctions = {
    newTerminal(path) {
      console.log("newTerminal called");
    },
    writeToFile(fileName, content) {
      console.log(fileName);
      console.log("writeToFile called");
    },
    remember(meta, content) {
      console.log("remember called");
    },
  };

  async function gpt() {
    try {
      const completion = await generate();
      let newAnswer = completion.data.choices[0].message;
      const patternToMatchTerminalCommands = /\[\[.*?\]\]/g;
      const commands = newAnswer.content.match(patternToMatchTerminalCommands);
      const patternToMatchSpecialFunctions =
        /{{\s*([a-zA-Z_]\w*)(\s*\(\s*([\w\s,]*)\s*\))?\s*}}/g;
      const specialFunctionCalls = newAnswer.content.match(
        patternToMatchSpecialFunctions
      );
      conversation.push(newAnswer);
      console.log(conversation);
      if (specialFunctionCalls) {
        specialFunctionCalls.forEach((call) => {
          callFromString(call, specialFunctions);
        });
      }
      if (commands) {
        activeTerminal.write(
          `${commands[0].substring(2, commands[0].length - 2)} \n`
        );
      }
      const sanitizedAnswer = newAnswer.content
        .replace(patternToMatchTerminalCommands, "")
        .replace(patternToMatchSpecialFunctions, "");
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

  return {
    apiKey: apiKey,
    addTerminal: (terminal) => {
      // main.js should update the frontend here
      terminal.onData((data) => {
        debouncedUpdateGPT(data);
      });
    },
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
