# Giving GPT-4 terminal access

###

How to dev

- after `npm install` you may need to run `npm run rebuild` to fix dependencies for Electron (different node version used for compile or something)
- create a `.env` file and set `OPENAI_API_KEY`
- `npm run start` - this will build and serve the react app. it won't actually work in the browswer because it's missing electron stuff on the `window` object
- in another terminal: `npm run electron`

### NEXT TODO:

[] give gpt control of the order it calls commands and special functions.
[] test change

### DONE:

[x] pass messages from front end to back end
[x] fix mainWindow is not defined
[x] show terminal
[x] pass message to gpt4 and return result
[x] system prompt for gpt4
[x] handle gpt terminal input
[x] use .env for api key

### IDEAS:

[] screen.log for history
[] strip ansi
[] use gpt3-5 for json reformatting
