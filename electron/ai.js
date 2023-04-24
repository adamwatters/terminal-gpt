const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");

const { systemPrompt } = require("./systemPrompt.js");

// i forget how to write js... so I'm doing this closure thing for now
let activeTerminal;

const AI = (apiKey, terminal, send) => {
  activeTerminal = terminal;

  // add a listener to the terminal to update the GPT. if we change the terminal we'll leave this in place for now.
  // ai will only be able to write to the last terminal added
  terminal.onData((data) => {
    console.log("data", data);
    // debouncedUpdateGPT(data);
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
      max_tokens: 2048,
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
    writeToFile(path, content) {
      console.log(content);
      let docAsString = content.join("\n");
      console.log(docAsString);
      fs.writeFileSync(path, docAsString);
    },
    remember(meta, content) {
      console.log("remember called");
    },
  };

  async function gpt() {
    try {
      const completion = await generate();
      let newAnswer = completion.data.choices[0].message;
      conversation.push(newAnswer);
      let content = newAnswer.content;
      let json = JSON.parse(content);
      console.log(json);
      if (json.actions) {
        let actions = json.actions;
        let i = 0;
        while (i < actions.length) {
          let action = actions[i];
          console.log(action);

          // handle actions here
          if (action.type === "terminal") {
            activeTerminal.write(`${action.input} \n`);
          }

          if (action.type === "message") {
            send(action.content.join("\n"));
          }

          i++;
        }
      }
      console.log(JSON.stringify(completion.data.usage));
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
      // we're not using this yet
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
