import * as firebase from "@firebase/testing";
import * as fs from "fs";

const testName = "firestore-local-emulator-test";
const rulesFilePath = "firestore.rules";

const authedApp = (auth?: object): firebase.firestore.Firestore => {
  return firebase
    .initializeTestApp({ projectId: testName, auth: auth })
    .firestore();
};

const adminApp = (): firebase.firestore.Firestore => {
  return firebase.initializeAdminApp({ projectId: testName }).firestore();
};

describe("Firestoreルールテスト", () => {
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

  const correctUserData = {
    name: "suzuki taro",
    gender: "male",
    birthday: "1989/04/25"
  };

  describe("認証情報の検証", () => {
    test("自分のuidと同様のドキュメントIDのユーザー情報だけを閲覧、作成、編集、削除可能", async () => {
      // taroで認証を持つDBの作成
      const db = authedApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 自分のuidと同様のドキュメントIDのユーザー情報を追加可能
      await firebase.assertSucceeds(userDocumentRef.set(correctUserData));

      // 自分のuidと同様のドキュメントIDのユーザー情報を閲覧可能
      await firebase.assertSucceeds(userDocumentRef.get());

      // 自分のuidと同様のドキュメントIDのユーザー情報を編集可能
      await firebase.assertSucceeds(
        userDocumentRef.update({ name: "SUZUKI TARO" })
      );

      // 自分のuidと同様のドキュメントIDのユーザー情報を削除可能
      await firebase.assertSucceeds(userDocumentRef.delete());
    });

    test("自分のuidと異なるドキュメントは閲覧、作成、編集、削除が出来ない", async () => {
      // 事前にadmin権限で別ユーザーでのデータを準備
      adminApp()
        .collection("users")
        .doc("taro")
        .set(correctUserData);

      // hanakoで認証を持つDBの作成
      const db = authedApp({ uid: "hanako" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 自分のuidと同様のドキュメントIDのユーザー情報を追加不可
      await firebase.assertFails(userDocumentRef.set(correctUserData));

      // 自分のuidと同様のドキュメントIDのユーザー情報を閲覧不可
      await firebase.assertFails(userDocumentRef.get());

      // 自分のuidと同様のドキュメントIDのユーザー情報を編集不可
      await firebase.assertFails(
        userDocumentRef.update({ name: "SUZUKI TARO" })
      );

      // 自分のuidと同様のドキュメントIDのユーザー情報を削除不可
      await firebase.assertFails(userDocumentRef.delete());
    });
  });
});
