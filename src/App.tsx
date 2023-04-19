import React, { useEffect, useState } from "react";
import { Terminal } from "xterm";
import "./App.css";
import "xterm/css/xterm.css";
const api = window.electronAPI;

var term = new Terminal();
term.open(document.getElementById("terminal"));
term.write(
  "🤖 🤝 🧑 \x1B[1;3;31mthis terminal can be used by you and gpt \x1B[0m $ "
);

api.handleTerminalData({
  handler: (data) => {
    term.write(data);
  },
});

term.onData((key) => {
  api.sendTerminalKeystroke({ key });
});

function App() {
  const [playerInput, setPlayerInput] = useState("");
  const [conversation, setConversation] = useState([]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setConversation([...conversation, { role: "user", content: playerInput }]);
    setPlayerInput("");
    const response = await api.userMessage({ message: playerInput });

    // TODO: do something with this response - disable button, show loading, show error, etc.
  };

  useEffect(() => {
    api.handleAIResponse({
      handler: (response) => {
        setConversation([
          ...conversation,
          { role: "assistant", content: response },
        ]);
      },
    });
  }, [conversation]);

  return (
    <div className="App">
      <div className="Conversation">
        {conversation.map((item, index) => {
          return (
            <div
              key={index}
              style={{
                padding: "10px",
                borderRadius: "4px",
                textAlign: "left",
                color: "white",
                background: item.role === "user" ? "purple" : "blue",
              }}
              className="conversation-item"
            >
              {item.content}
            </div>
          );
        })}
      </div>
      <form
        className="user-input_form"
        style={{
          display: "flex",
          padding: "8px",
          transition: "bottom 1s",
        }}
        onSubmit={onSubmit}
      >
        <input
          className="user-input_text-box"
          type="text"
          name="playerInput"
          placeholder="talk to the AI"
          value={playerInput}
          onChange={(e) => setPlayerInput(e.target.value)}
        />
        <input
          className="user-input_submit-button"
          type="submit"
          value={"Send"}
          disabled={!playerInput || !playerInput.trim()}
        />
      </form>
    </div>
  );
}

export default App;
