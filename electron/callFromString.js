const callFromString = (string, functions) => {
  const pattern = /^\{\{(\w+)(?:\((.*)\))?\}\}$/;
  const match = string.match(pattern);

  if (!match) {
    console.error("The string does not match the pattern of a function.");
    return;
  }

  const functionName = match[1];
  const params = match[2]
    ? match[2].split(",").map((param) => param.trim())
    : [];

  if (!functions.hasOwnProperty(functionName)) {
    console.error(
      `The function '${functionName}' does not exist in the object of available functions.`
    );
    return;
  }

  functions[functionName](...params);
};

module.exports = {
  callFromString,
};
