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
      console.log(JSON.stringify(completion.data.usage));
      const patternToMatchTerminalCommands =
        /<\s*COMMAND\s*>[\s\S]*?<\s*\/\s*COMMAND\s*>/g;
      const commands = newAnswer.content.match(patternToMatchTerminalCommands);
      const patternToMatchSpecialFunctions =
        /<\s*FUNC\s*>[\s\S]*?<\s*\/\s*FUNC\s*>/g;
      const specialFunctionCalls = newAnswer.content.match(
        patternToMatchSpecialFunctions
      );
      conversation.push(newAnswer);
      console.log(conversation);
      if (specialFunctionCalls) {
        specialFunctionCalls.forEach((call) => {
          let jsonString = call.replace("<FUNC>", "").replace("</FUNC>", "");
          console.log("jsonString");
          console.log(jsonString);
          try {
            let json = JSON.parse(jsonString);
            if (json.name === "newTerminal") {
              specialFunctions.newTerminal(json.path);
            }
            if (json.name === "writeToFile") {
              specialFunctions.writeToFile(json.path, json.content);
            }
          } catch (error) {
            console.log("error parsing json");
            console.log(error);
            conversation.push({
              role: "user",
              content: `Something went wrong parsing the JSON in your <FUNC></FUNC> call. Here's the error: ${error}`,
            });
            gpt(); // send the parse error back to gpt and let it try to fix it
            return;
          }
        });
      }
      if (commands) {
        let firstCommand = commands[0]
          .replace("<COMMAND>", "")
          .replace("</COMMAND>", "");
        activeTerminal.write(`${firstCommand} \n`);
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
