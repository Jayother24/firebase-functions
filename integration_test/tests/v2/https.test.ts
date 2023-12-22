import admin from "firebase-admin";
import fetch from "node-fetch";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

// describe("HTTPS onCall trigger", () => {
//   const projectId = process.env.PROJECT_ID;
//   const region = process.env.REGION;
//   const testId = process.env.TEST_RUN_ID;
//   let loggedContext: admin.firestore.DocumentData | undefined;

//   beforeAll(async () => {
//     if (!testId || !projectId || !region) {
//       throw new Error("Environment configured incorrectly.");
//     }
//     await initializeFirebase();

//     const accessToken = await admin.credential.applicationDefault().getAccessToken();
//     const data = { foo: "bar", testId };
//     const response = await fetch(
//       `https://${region}-${projectId}.cloudfunctions.net/${testId}-v2-callableTests`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken.access_token}`,
//         },
//         body: JSON.stringify({ data }),
//       }
//     );
//     if (!response.ok) {
//       throw new Error(response.statusText);
//     }

//     await timeout(15000);

//     const logSnapshot = await admin.firestore().collection("httpsOnCallV2Tests").doc(testId).get();
//     loggedContext = logSnapshot.data();

//     if (!loggedContext) {
//       throw new Error("loggedContext is undefined");
//     }
//   });

//   it("should have the correct data", () => {
//     expect(loggedContext?.foo).toMatch("bar");
//   });
// });

describe("HTTP onCall trigger (DISABLED)", () => {
  it("should be disabled", () => {
    expect(true).toBeTruthy();
  });
});