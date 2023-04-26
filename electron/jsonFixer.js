const SYSTEM =
  "You are a json validator. You should ALWAYS only respond in JSON. Your only job is to fix errors in JSON.";

const USER_EXAMPLE_1 = `
{
    "type": "ai-actions",
    "goal": "create a node script called word-play.js that prints 'hello world' to the console",
    "actions": [
      {
        "type": "message",
        "content": [
          "Alright! I'll create a file named 'word-play.js' and add code to print 'hello world'."
        ]
      },
      {
        "type" :="special",
        method":"writeFile",
       path:"./word-play.js","content":["// word-play.js", "", "// Print hello world to the console", "", "
  console.log('Hello, World!');"]
  }
`;

const ASSISTANT_EXAMPLE_1 = `{
    "type": "ai-actions",
    "goal": "create a node script called word-play.js that prints 'hello world' to the console",
    "actions": [
      {
        "type": "message",
        "content": [
          "Alright! I'll create a file named 'word-play.js' and add code to print 'hello world'."
        ]
      },
      {
        "type": "special",
        "method": "writeFile",
        "path": "./word-play.js",
        "content": ["// word-play.js", "", "// Print hello world to the console", "", "console.log('Hello, World!');"]
      }
    ]
  }`;

const USER_EXAMPLE_2 = `{
    type: 'ai-actions',
    goal: 'greet the user and ask what they would like to do",
    actions: [ { type: 'message', content: ["hello user"] } ]
  }`;

const ASSISTANT_EXAMPLE_2 = `{
    "type": "ai-actions",
    "goal": "greet the user and ask what they would like to do",
    "actions": [
      {
        "type": "message",
        "content": [
          "hello user"
        ]
      }
    ]
  }`;

const JSONFixer = (oai) => {
  return {
    fix: async (json) => {
      const completion = await oai.createChatCompletion({
        model: "gpt-3.5-turbo",
        frequency_penalty: 0,
        max_tokens: 2048,
        presence_penalty: 0,
        stream: false,
        temperature: 0.3,
        top_p: 1,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: USER_EXAMPLE_1 },
          { role: "assistant", content: ASSISTANT_EXAMPLE_1 },
          { role: "user", content: USER_EXAMPLE_2 },
          { role: "assistant", content: ASSISTANT_EXAMPLE_2 },
          { role: "user", content: JSON.stringify(json) },
        ],
      });
      return completion.data.choices[0].message.content;
    },
  };
};

module.exports = {
  JSONFixer,
};
