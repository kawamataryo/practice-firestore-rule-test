import * as firebase from "@firebase/testing";
import * as fs from "fs";

const testName = "firestore-local-emulator-test";
const rulesFilePath = "firestore.rules";

function authedApp(auth?: object): firebase.firestore.Firestore {
  return firebase
    .initializeTestApp({ projectId: testName, auth: auth })
    .firestore();
}

describe("Firestoreルールテスト", () => {
  describe("認証情報の検証", () => {
    beforeAll(async () => {
      await firebase.loadFirestoreRules({
        projectId: testName,
        rules: fs.readFileSync(rulesFilePath, "utf8")
      });
    });

    afterEach(async () => {
      await firebase.clearFirestoreData({ projectId: testName });
    });

    afterAll(async () => {
      await Promise.all(firebase.apps().map(app => app.delete()));
    });

    test("認証ユーザーなら読み込みが可能", async () => {
      const db = authedApp();
      const user = db.collection("users").doc("alice");
      await firebase.assertSucceeds(user.get());
    });
  });
});
