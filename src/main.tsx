import "./createPost.js";

import { Devvit, useState } from "@devvit/public-api";
import { LeaderboardManager } from "./events.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Jump Game Example",
  height: "tall",
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? "anon";
    });

    // Create a reactive state for web view visibility
    const [webviewVisible, setWebviewVisible] = useState(false);

    const easyLeaderBoard = new LeaderboardManager(context);
    const midLeaderBoard = new LeaderboardManager(context);

    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: any) => {
      switch (msg.type) {
        case "updateTop5":
          // await updateTop5(context, msg.data.username, msg.data.score);
          await easyLeaderBoard.updateTopN(
            "leaderboard",
            "updateLeaderboard",
            msg.data.username,
            msg.data.score
          );
          break;
        case "updateTopMidMode":
          // await updateTop5(context, msg.data.username, msg.data.score);
          await midLeaderBoard.updateTopN(
            "leaderboardMidMode",
            "updateLeaderboardMidMode",
            msg.data.username,
            msg.data.score
          );
          break;
        default:
          throw new Error(`Unknown message type: ${msg}`);
      }
    };

    // When the button is clicked, send initial data to web view and show it
    const onShowWebviewClick = async () => {
      setWebviewVisible(true);

      const topFive = await context.redis.zRange("leaderboard", 0, 4);
      const topFiveMidMode = await context.redis.zRange(
        "leaderboardMidMode",
        0,
        4
      );

      const t5 = topFive.sort((a, b) => b.score - a.score);
      const t5MidMode = topFiveMidMode.sort((a, b) => b.score - a.score);

      context.ui.webView.postMessage("myWebView", {
        type: "initialData",
        data: {
          username: username,
          top: t5,
        },
      });

      context.ui.webView.postMessage("myWebView", {
        type: "updateLeaderboard",
        data: {
          top: t5,
        },
      });

      context.ui.webView.postMessage("myWebView", {
        type: "updateLeaderboardMidMode",
        data: {
          top: t5MidMode,
        },
      });
    };

    // Render the custom post type
    return (
      <vstack grow padding="small">
        {!webviewVisible && (
          <zstack
            grow={!webviewVisible}
            height={webviewVisible ? "0%" : "100%"}
          >
            <image
              url={context.assets.getURL("odyssey.png")}
              height="100%"
              width="100%"
              resizeMode="cover"
              imageWidth={1344}
              imageHeight={768}
            />
            <vstack alignment="middle center" height="100%" width="100%">
              <button
                appearance="success"
                onPress={onShowWebviewClick}
                size="large"
              >
                Play
              </button>
            </vstack>
          </zstack>
        )}
        {webviewVisible && (
          <vstack grow height="100%">
            <vstack border="thick" borderColor="black" height="100%">
              <webview
                id="myWebView"
                url="page.html"
                onMessage={(msg) => onMessage(msg)}
                grow
                height="100%"
              />
            </vstack>
          </vstack>
        )}
      </vstack>
    );
  },
});

export default Devvit;
