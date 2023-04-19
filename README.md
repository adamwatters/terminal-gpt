# Giving GPT-4 terminal access

###

How to dev

- process.env.OPENAI_API_KEY doesn't work currently... hard code your OpenAI Api key and remember to not commit it :/
- `npm run start` - this will build and serve the react app. it won't actually work in the browswer because it's missing electron stuff on the `window` object
- in another terminal: `npm run electron`

### NEXT TODO:

[] fix .env

### DONE:

[x] pass messages from front end to back end
[x] fix mainWindow is not defined
[x] show terminal
[x] pass message to gpt4 and return result
[x] system prompt for gpt4
[x] handle gpt terminal input
