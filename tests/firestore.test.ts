import * as firebase from "@firebase/testing";
import * as fs from "fs";

const testName = "firestore-local-emulator-test";
const rulesFilePath = "firestore.rules";

const createAuthApp = (auth?: object): firebase.firestore.Firestore => {
  return firebase
    .initializeTestApp({ projectId: testName, auth: auth })
    .firestore();
};

const createAdminApp = (): firebase.firestore.Firestore => {
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
    age: 30
  };

  describe("認証情報の検証", () => {
    test("自分のuidと同様のドキュメントIDのユーザー情報だけを閲覧、作成、編集、削除可能", async () => {
      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

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
      createAdminApp()
        .collection("users")
        .doc("taro")
        .set(correctUserData);

      // hanakoで認証を持つDBの作成
      const db = createAuthApp({ uid: "hanako" });

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

  describe("スキーマの検証", () => {
    test("正しくないスキーマの場合は作成できない", async () => {
      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 想定外のプロパティがある場合
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, place: "japan" })
      );

      // プロパティの型が異なる場合
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, name: 1234 })
      );
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, gender: true })
      );
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, age: "1" })
      );
    });

    test("正しくないスキーマの場合は編集できない", async () => {
      // 事前にadmin権限で別ユーザーでのデータを準備
      createAdminApp()
        .collection("users")
        .doc("taro")
        .set(correctUserData);

      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 想定外のプロパティがある場合
      await firebase.assertFails(userDocumentRef.update({ place: "japan" }));

      // プロパティの型が異なる場合
      await firebase.assertFails(userDocumentRef.update({ name: 1234 }));
      await firebase.assertFails(userDocumentRef.set({ gender: true }));
      await firebase.assertFails(userDocumentRef.set({ age: "1" }));
    });
  });

  describe("値のバリデーション", () => {
    test("nameは1文字以上30文字以内である", async () => {
      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 正しい値ではデータを作成できる
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, name: "a".repeat(30) })
      );

      // 正しくない値ではデータを作成できない
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, name: "" })
      );
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, name: "a".repeat(31) })
      );
    });

    test("`gender`は`male`, `female`, `genderDiverse`の３種類だけが選べる", async () => {
      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 正しい値ではデータを作成できる
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, gender: "male" })
      );
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, gender: "female" })
      );
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, gender: "genderDiverse" })
      );

      // 正しくない値ではデータを作成できない
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, gender: "" })
      );
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, gender: "男性" })
      );
    });

    test("`age`は0〜150の数値である", async () => {
      // taroで認証を持つDBの作成
      const db = createAuthApp({ uid: "taro" });

      // taroでusersコレクションへの参照を取得
      const userDocumentRef = db.collection("users").doc("taro");

      // 正しい値ではデータを作成できる
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, age: 0 })
      );
      await firebase.assertSucceeds(
        userDocumentRef.set({ ...correctUserData, age: 150 })
      );

      // 正しくない値ではデータを作成できない
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, age: -1 })
      );
      await firebase.assertFails(
        userDocumentRef.set({ ...correctUserData, age: 151 })
      );
    });
  });
});
