import React, { useEffect, useState, useRef } from "react";
import { Terminal } from "xterm";
import "./App.css";
import "xterm/css/xterm.css";
const api = window.electronAPI;

var term = new Terminal({ convertEol: true });

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
  const chatScrollRef = useRef(null);
  const xtermRef = useRef(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setConversation([...conversation, { role: "user", content: playerInput }]);
    setPlayerInput("");
    const response = await api.userMessage({ message: playerInput });
    // TODO: do something with this response - disable button, show loading, show error, etc.
  };

  useEffect(() => {
    const termElement = xtermRef.current;
    let terminalInitialized = false;
    const debouncedInitialize = (() => {
      let timerId;
      return function () {
        if (timerId) {
          clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
          console.log("sending terminal ready");
          api.sendTerminalReady();
          terminalInitialized = true;
        }, 1000);
      };
    })();
    if (termElement.children.length === 0) {
      console.log("initializing terminal");
      term.open(termElement);
      term.onRender(() => {
        if (!terminalInitialized) {
          debouncedInitialize();
        }
        terminalInitialized = true;
      });
      term.onLineFeed(() => {
        console.log("line feed");
      });
    }
  }, []);

  // scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation]);

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
      <div ref={chatScrollRef} className="Conversation">
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
      <div className="bottom-row">
        <div ref={xtermRef} id="terminal"></div>
        <div className="text-editor">documents go here</div>
      </div>
    </div>
  );
}

export default App;
