const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const { jsonrepair } = require("jsonrepair");
const { JSONFixer } = require("./jsonFixer.js");
const { systemPrompt } = require("./systemPrompt.js");

// this sucks... find a better way to do this
let stripAnsi;
import("strip-ansi").then((module) => {
  stripAnsi = module.default;
});

// i forget how to write js... so I'm doing this closure thing for now
let activeTerminal;

// const writeToTerminal = async (data) => {
//   activeTerminal.onData((data) => {});
//   return new Promise((resolve, reject) => {});
// };

const AI = (apiKey, terminal, webContents) => {
  activeTerminal = terminal;
  let terminalData = "";
  let aiStates = "ready";

  const writeToTerminal = async function (data) {
    let termData = "";
    let timerId = null;
    let disposable = null;
    const writeAndListenForChanges = async () => {
      let promise = new Promise(function (resolve, reject) {
        disposable = activeTerminal.onData((data) => {
          termData += stripAnsi(data);
          if (timerId) {
            clearTimeout(timerId);
          }
          timerId = setTimeout(() => {
            resolve(termData);
          }, 2000);
        });
      });
      activeTerminal.write(data);
      return promise;
    };
    let result = await writeAndListenForChanges();
    disposable.dispose();
    return result;
  };

  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);
  const conversation = [{ role: "system", content: systemPrompt }];

  const jsonFixer = JSONFixer(openai);

  async function generate() {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      frequency_penalty: 0.2,
      max_tokens: 2048,
      presence_penalty: 0.2,
      stream: false,
      temperature: 0.5,
      top_p: 1,
      messages: conversation,
    });
    return completion;
  }

  async function gpt() {
    // ask gpt for a completion, early return here if it fails
    let completion;
    webContents.send("ai-state-update", "busy");
    try {
      completion = await generate();
      console.log(JSON.stringify(completion.data.usage));
    } catch (error) {
      webContents.send("ai-state-update", "failed");
      // Consider adjusting the error handling logic for your use case
      if (error.response) {
        console.error(
          `Error with OpenAI API request: ${JSON.stringify(
            error.response.data
          )}`
        );
        return;
      } else {
        console.error(`Error with OpenAI API request: ${error.message}`);
        return;
      }
    }

    // add the response to the conversation, pull out the content
    let message = completion.data.choices[0].message;
    conversation.push(message);
    let content = message.content;

    // json parsing and fixing
    let json;
    try {
      json = JSON.parse(content);
    } catch (e1) {
      console.log("error parsing json, trying to repair: ", e1);
      try {
        json = JSON.parse(jsonrepair(content));
      } catch (e2) {
        let attemptedFix = await jsonFixer.fix(content);
        try {
          console.log(
            "json repair failed, sending it to jsonFixer (gpt-3.5-turbo) "
          );
          json = JSON.parse(attemptedFix);
        } catch {
          console.log("jsonFixer failed, giving up");
        }
      }
    }

    // guard against undefined json
    if (!json) {
      console.log("something went wrong - json is undefined");
      webContents.send("ai-state-update", "failed");
      return;
    }

    console.log("json parsed successfully - performing actions");
    console.log(json);
    if (json.actions) {
      let actions = json.actions;
      let results = [];
      let i = 0;
      let failed = false;
      while (i < actions.length && !failed) {
        let action = actions[i];

        // handle actions here
        if (action.type === "terminal") {
          let result = await writeToTerminal(`${action.input} \n`);
          results.push(result);
        }

        if (action.type === "special") {
          if (action.method === "writeFile" && action.path) {
            let docAsString = action.content.join("\n");
            try {
              fs.writeFileSync(action.path, docAsString);
              results.push("ok");
            } catch {
              console.log("failed to write file");
              results.push("writeFile failed");
            }
          }
        }

        if (action.type === "message" && action.content.length > 0) {
          results.push("ok");
          webContents.send(
            "ai-response",
            action.content.join ? action.content.join("\n") : action.content
          );
        }
        i++;
      }

      webContents.send("ai-state-update", "ready");

      console.log("results: ", results);
      conversation.push({
        role: "user",
        content: JSON.stringify({
          type: "action-results",
          results: results,
        }),
      });
    }
  }

  return {
    apiKey: apiKey,
    writeToTerminal,
    start: async () => {
      // main.js should update the frontend here
      // we're not using this yet
      const result = await writeToTerminal("pwd \n");
      conversation.push({
        role: "user",
        content: JSON.stringify({
          type: "intialize",
          terminal: result,
        }),
      });
    },
    addTerminal: (terminal) => {
      // main.js should update the frontend here
      // switch active terminal
      // should be able to handle multiple terminals
    },
    prompt: async (input) => {
      if (!input || input.trim().length === 0) {
        return {
          error: "Please enter a valid message",
        };
      }
      conversation.push({ role: "user", content: input });
      return await gpt();
    },
  };
};

module.exports = {
  AI,
};
