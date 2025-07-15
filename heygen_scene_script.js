import puppeteer from "puppeteer-core";

const buildScenes = async(scenes) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
    executablePath: process.env.CHROME_PATH_MAC
  });
  const page = await browser.newPage();
  await page.goto("https://app.heygen.com/login", {
    waitUntil: "networkidle0",
  });

  console.log("🔐 Logging in...");
  await page.type("#username", process.env.HEY_GEN_Username);
  await page.type("#password", process.env.HEY_GEN_Pwd);
  await page.click("button.css-iak95n");
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("✅ Logged in");

  // Create New Project
  console.log("🎬 Creating new project...");
  await page.waitForSelector(".tw-w-full.css-1bqvku1");
  await page.click(".tw-w-full.css-1bqvku1");

  // Select landscape
  await page.waitForSelector("button");
  await page.$$eval("button", (buttons) => {
    const target = buttons.find(
      (btn) => btn.textContent.trim() === "Create landscape video"
    );
    if (target) target.click();
  });

  // Wait for first scene to load
  await page.waitForSelector(
    "div.tw-flex.tw-h-8.tw-cursor-pointer.tw-items-center.tw-gap-1.tw-rounded-sm.tw-border.tw-border-line.tw-px-2.tw-transition-colors"
  );
  console.log("✅ Scene 1 ready");

  for (let i = 0; i < scenes.length; i++) {
    const { avatarName, script } = scenes[i];

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const selector =
        "#root > div > div > div:nth-child(3) > div.css-1927rse > div.css-1o8d1qj > div.css-upkrwj > div > div > div > div.react-renderer.node-sceneFooter > div > div > div > div > div > button:nth-child(1)"; // or a shorter reliable part
      await page.waitForSelector(selector, { visible: true });
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ block: "center" });
      }, selector);
      await page.click(selector);

      console.log("➕ Scene added");

      await page.waitForFunction(
        (count) =>
          document.querySelectorAll("div.react-renderer.node-sceneHeader")
            .length >= count,
        {},
        i + 1
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const sceneHeaders = await page.$$("div.react-renderer.node-sceneHeader");
    const sceneSegments = await page.$$("div.react-renderer.node-segment");
    const sceneFooters = await page.$$("div.react-renderer.node-sceneFooter");

    const currentHeader = sceneHeaders[i];
    await page.evaluate((sceneIndex) => {
      const sceneHeaders = document.querySelectorAll(
        "div.react-renderer.node-sceneHeader"
      );
      if (sceneHeaders.length > sceneIndex) {
        sceneHeaders[sceneIndex].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, i);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const currentSegment = sceneSegments[i];
    const currentFooter = sceneFooters[i];

    if (!currentHeader || !currentSegment || !currentFooter) {
      console.log(`❌ Scene ${i + 1} not fully loaded. Skipping.`);
      continue;
    }

    const avatarDropdown = await currentHeader.$(
      "div.tw-flex.tw-h-8.tw-cursor-pointer.tw-items-center.tw-gap-1.tw-rounded-sm.tw-border.tw-border-line.tw-px-2.tw-transition-colors"
    );
    if (!avatarDropdown) {
      console.log(`❌ Avatar dropdown not found for scene ${i + 1}`);
      continue;
    }

    await avatarDropdown.click();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await page.waitForSelector(".css-17snjjc-text");

      const replaceButtons = await page.$$(".css-17snjjc-text");
      const buttonIndex = replaceButtons.length - 2; // even indexes: 0, 2, 4, ...

      if (replaceButtons.length > buttonIndex) {
        await replaceButtons[buttonIndex].click();
        console.log(
          `🔄 Replace avatar clicked for scene ${i + 1
          } (button index ${buttonIndex})`
        );
      } else {
        console.log(
          `❌ Replace avatar button not found for scene ${i + 1
          } (index ${buttonIndex})`
        );
        continue;
      }
    } catch (err) {
      console.log(
        `❌ Failed clicking Replace avatar for scene ${i + 1}:`,
        err.message
      );
      continue;
    }

    try {
      await page.waitForSelector(`label[title="${avatarName}"]`, {
        timeout: 5000,
      });

      const avatarCards = await page.$$("div.css-lj3ehj");
      let avatarSet = false;
      for (const card of avatarCards) {
        const label = await card.$(`label[title="${avatarName}"]`);
        if (label) {
          await card.click();
          avatarSet = true;
          console.log(`✅ Avatar "${avatarName}" selected for scene ${i + 1}`);
          break;
        }
      }

      if (!avatarSet) {
        console.log(`❌ Avatar "${avatarName}" not found`);
      }
    } catch (e) {
      console.log(`❌ Avatar selection failed for scene ${i + 1}`);
      continue;
    }

    try {
      await page.waitForSelector(".tw-hidden.css-1up75ig", { timeout: 5000 });
      await page.click(".tw-hidden.css-1up75ig");
    } catch (e) {
      console.log(`⚠️ Animation type button missing for scene ${i + 1}`);
    }

    try {
      await page.waitForSelector("span[data-node-view-content-react]", {
        timeout: 5000,
      });

      await page.evaluate(
        (i, scriptText) => {
          const scriptSpans = document.querySelectorAll(
            "span[data-node-view-content-react]"
          );
          if (scriptSpans.length > i) {
            const span = scriptSpans[i];
            span.innerText = scriptText;
            span.dispatchEvent(new Event("input", { bubbles: true }));
            span.dispatchEvent(new Event("blur", { bubbles: true }));
            console.log(`✅ Script injected into scene ${i + 1}`);
          } else {
            console.log(`❌ Script span not found for scene ${i + 1}`);
          }
        },
        i,
        script
      );

      console.log(`✍️ Script added to scene ${i + 1}`);
    } catch (e) {
      console.log(`❌ Failed to add script to scene ${i + 1}:`, e.message);
    }
  }

  console.log("✅ All scenes created successfully!");
  // await browser.close(); // Optional: close after task
}

export default buildScenes
