/* =====================================================
   Circle Accounting
   Firebase Authentication + Firestore + LocalStorage
   Mobile / GitHub Pages対応 完成版
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


/* =====================================================
   Firebase設定
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyAvDWjqiv4G-fMW3_ovTtDLXT-514Q5TX8",
    authDomain: "circle-accounting-b2194.firebaseapp.com",
    projectId: "circle-accounting-b2194",
    storageBucket: "circle-accounting-b2194.firebasestorage.app",
    messagingSenderId: "122808479714",
    appId: "1:122808479714:web:b4f74aa3412064bee653bb"
};


/* =====================================================
   Firebase初期化
===================================================== */

let firebaseApp = null;
let db = null;
let auth = null;

let firebaseReady = false;
let currentUser = null;

try {

    firebaseApp =
        initializeApp(firebaseConfig);

    db =
        getFirestore(firebaseApp);

    auth =
        getAuth(firebaseApp);

    firebaseReady = true;

    console.log("🔥 Firebase初期化成功");

}
catch (error) {

    console.error(
        "Firebase初期化エラー:",
        error
    );

    firebaseReady = false;

}


/* =====================================================
   初期グループ
===================================================== */

const DEFAULT_GROUPS = [

    {
        id: 1,
        name: "未所属",
        color: "#dbeafe"
    }

];


/* =====================================================
   初期データ
===================================================== */

const DEFAULT_DATA = {

    events: [

        {
            id: 1,
            name: "新歓",
            fee: 3000,
            members: {},
            income: [],
            expenses: []
        }

    ],

    members: [

        {
            id: 1,
            name: "田中太郎",
            groupId: 1
        },

        {
            id: 2,
            name: "佐藤花子",
            groupId: 1
        },

        {
            id: 3,
            name: "鈴木一郎",
            groupId: 1
        },

        {
            id: 4,
            name: "高橋健太",
            groupId: 1
        },

        {
            id: 5,
            name: "伊藤美咲",
            groupId: 1
        },

        {
            id: 6,
            name: "山田翔",
            groupId: 1
        }

    ],

    groups:
        structuredClone(DEFAULT_GROUPS),

    currentEventId: 1

};


/* =====================================================
   データ本体
===================================================== */

let data =
    loadLocalData();


/* =====================================================
   LocalStorageキー
===================================================== */

function getLocalStorageKey() {

    if (currentUser) {

        return (
            "circleAccounting_" +
            currentUser.uid
        );

    }

    return "circleAccounting_guest";

}


/* =====================================================
   LocalStorage読み込み
===================================================== */

function loadLocalData() {

    try {

        const possibleKeys = [

            "circleAccounting",

            "circleAccounting_guest"

        ];

        for (
            const key of possibleKeys
        ) {

            const saved =
                localStorage.getItem(key);

            if (!saved) continue;

            const parsed =
                JSON.parse(saved);

            normalizeData(parsed);

            return parsed;

        }

    }
    catch (error) {

        console.error(
            "LocalStorage読み込みエラー:",
            error
        );

    }


    return structuredClone(
        DEFAULT_DATA
    );

}


/* =====================================================
   データ整形
===================================================== */

function normalizeData(target) {

    if (
        !target ||
        typeof target !== "object"
    ) {

        return;

    }


    if (
        !Array.isArray(target.groups)
    ) {

        target.groups =
            structuredClone(
                DEFAULT_GROUPS
            );

    }


    if (
        !Array.isArray(target.members)
    ) {

        target.members = [];

    }


    if (
        !Array.isArray(target.events)
    ) {

        target.events = [];

    }


    target.members.forEach(
        member => {

            if (!member.groupId) {

                member.groupId = 1;

            }

        }
    );


    target.events.forEach(
        event => {

            if (!event.members) {

                event.members = {};

            }

            if (!Array.isArray(event.income)) {

                event.income = [];

            }

            if (!Array.isArray(event.expenses)) {

                event.expenses = [];

            }

            if (
                typeof event.fee !== "number"
            ) {

                event.fee =
                    Number(event.fee) || 0;

            }

        }
    );


    if (
        target.events.length > 0 &&
        !target.events.some(
            event =>
                event.id ===
                target.currentEventId
        )
    ) {

        target.currentEventId =
            target.events[0].id;

    }

}


/* =====================================================
   LocalStorage保存
===================================================== */

function saveLocalOnly() {

    try {

        localStorage.setItem(
            getLocalStorageKey(),
            JSON.stringify(data)
        );

    }
    catch (error) {

        console.error(
            "LocalStorage保存エラー:",
            error
        );

    }

}


/* =====================================================
   Firestore参照
===================================================== */

function getCloudDataRef() {

    if (
        !firebaseReady ||
        !db ||
        !currentUser
    ) {

        return null;

    }


    return doc(
        db,
        "users",
        currentUser.uid,
        "accounting",
        "data"
    );

}


/* =====================================================
   Firebase状態
===================================================== */

let cloudLoading = false;
let cloudSaving = false;


/* =====================================================
   クラウド状態表示
===================================================== */

function showCloudStatus(message) {

    let status =
        document.getElementById(
            "cloudStatus"
        );


    if (!status) {

        status =
            document.createElement(
                "div"
            );

        status.id =
            "cloudStatus";

        status.style.position =
            "fixed";

        status.style.right =
            "15px";

        status.style.bottom =
            "15px";

        status.style.zIndex =
            "99999";

        status.style.padding =
            "9px 13px";

        status.style.borderRadius =
            "10px";

        status.style.background =
            "#111827";

        status.style.color =
            "white";

        status.style.fontSize =
            "12px";

        status.style.fontWeight =
            "bold";

        status.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.2)";

        status.style.transition =
            "opacity .3s";

        document.body.appendChild(
            status
        );

    }


    status.textContent =
        message;

    status.style.opacity =
        "1";


    clearTimeout(
        status._timer
    );


    status._timer =
        setTimeout(
            () => {

                status.style.opacity =
                    "0.75";

            },
            3000
        );

}


/* =====================================================
   ログイン画面
===================================================== */

function createLoginScreen() {

    let overlay =
        document.getElementById(
            "loginOverlay"
        );


    if (overlay) {

        return overlay;

    }


    overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "loginOverlay";


    overlay.innerHTML = `

        <div class="login-box">

            <div class="login-logo">
                ⚽
            </div>

            <h1>
                Circle Accounting
            </h1>

            <p class="login-subtitle">
                サークル会計管理システム
            </p>


            <div
                id="loginMessage"
                class="login-message">
            </div>


            <input
                type="email"
                id="loginEmail"
                placeholder="メールアドレス"
                autocomplete="email"
            >


            <input
                type="password"
                id="loginPassword"
                placeholder="パスワード"
                autocomplete="current-password"
            >


            <button
                id="loginButton"
                class="login-primary">
                ログイン
            </button>


            <button
                id="registerButton"
                class="login-secondary">
                新規アカウント登録
            </button>


            <div
                id="loginLoading"
                class="login-loading">
                処理中...
            </div>

        </div>

    `;


    const style =
        document.createElement(
            "style"
        );


    style.textContent = `

        #loginOverlay {

            position: fixed;
            inset: 0;
            z-index: 100000;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                linear-gradient(
                    135deg,
                    #eff6ff,
                    #f8fafc
                );

            box-sizing: border-box;

        }


        .login-box {

            width: 100%;
            max-width: 420px;

            padding: 32px 24px;

            background: white;

            border-radius: 24px;

            box-shadow:
                0 20px 60px
                rgba(0,0,0,0.12);

            text-align: center;

            box-sizing: border-box;

        }


        .login-logo {

            font-size: 48px;

            margin-bottom: 8px;

        }


        .login-box h1 {

            margin: 0;

            font-size: 25px;

            color: #111827;

        }


        .login-subtitle {

            margin:
                8px 0 24px;

            color: #6b7280;

            font-size: 14px;

        }


        .login-box input {

            width: 100%;

            box-sizing: border-box;

            padding: 14px 15px;

            margin-bottom: 12px;

            border:
                1px solid #d1d5db;

            border-radius: 12px;

            font-size: 16px;

            outline: none;

        }


        .login-box input:focus {

            border-color: #2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,0.12);

        }


        .login-primary,
        .login-secondary {

            width: 100%;

            border: none;

            border-radius: 12px;

            padding: 14px;

            font-size: 16px;

            font-weight: bold;

            cursor: pointer;

            margin-top: 4px;

        }


        .login-primary {

            background: #2563eb;

            color: white;

        }


        .login-secondary {

            background: #eff6ff;

            color: #2563eb;

            margin-top: 10px;

        }


        .login-message {

            min-height: 20px;

            margin-bottom: 10px;

            color: #dc2626;

            font-size: 13px;

        }


        .login-loading {

            display: none;

            margin-top: 15px;

            color: #6b7280;

            font-size: 13px;

        }


        @media (max-width: 480px) {

            #loginOverlay {

                padding: 14px;

            }

            .login-box {

                padding:
                    28px 18px;

                border-radius: 20px;

            }

        }

    `;


    document.head.appendChild(
        style
    );


    document.body.appendChild(
        overlay
    );


    const loginButton =
        document.getElementById(
            "loginButton"
        );


    const registerButton =
        document.getElementById(
            "registerButton"
        );


    loginButton.onclick =
        loginUser;


    registerButton.onclick =
        registerUser;


    return overlay;

}


/* =====================================================
   ログインメッセージ
===================================================== */

function showLoginMessage(message) {

    const element =
        document.getElementById(
            "loginMessage"
        );


    if (element) {

        element.textContent =
            message;

    }

}


/* =====================================================
   ログイン処理
===================================================== */

async function loginUser() {

    if (!auth) {

        showLoginMessage(
            "Firebaseに接続できません"
        );

        return;

    }


    const email =
        document.getElementById(
            "loginEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "loginPassword"
        )?.value;


    if (!email || !password) {

        showLoginMessage(
            "メールアドレスとパスワードを入力してください"
        );

        return;

    }


    setLoginLoading(true);


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        showLoginMessage("");

    }
    catch (error) {

        console.error(
            "ログインエラー:",
            error
        );


        showLoginMessage(
            getAuthErrorMessage(
                error
            )
        );

    }
    finally {

        setLoginLoading(false);

    }

}


/* =====================================================
   新規登録
===================================================== */

async function registerUser() {

    if (!auth) {

        showLoginMessage(
            "Firebaseに接続できません"
        );

        return;

    }


    const email =
        document.getElementById(
            "loginEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "loginPassword"
        )?.value;


    if (!email || !password) {

        showLoginMessage(
            "メールアドレスとパスワードを入力してください"
        );

        return;

    }


    if (password.length < 6) {

        showLoginMessage(
            "パスワードは6文字以上にしてください"
        );

        return;

    }


    if (
        !confirm(
            "このメールアドレスでアカウントを作成しますか？"
        )
    ) {

        return;

    }


    setLoginLoading(true);


    try {

        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );


        showLoginMessage(
            ""
        );

    }
    catch (error) {

        console.error(
            "新規登録エラー:",
            error
        );


        showLoginMessage(
            getAuthErrorMessage(
                error
            )
        );

    }
    finally {

        setLoginLoading(false);

    }

}


/* =====================================================
   Firebaseエラー日本語化
===================================================== */

function getAuthErrorMessage(error) {

    const code =
        error?.code || "";


    switch (code) {

        case "auth/invalid-email":

            return "メールアドレスの形式が正しくありません。";


        case "auth/user-not-found":

            return "このアカウントは存在しません。";


        case "auth/wrong-password":

            return "パスワードが間違っています。";


        case "auth/invalid-credential":

            return "メールアドレスまたはパスワードが間違っています。";


        case "auth/email-already-in-use":

            return "このメールアドレスはすでに登録されています。";


        case "auth/weak-password":

            return "パスワードは6文字以上にしてください。";


        case "auth/too-many-requests":

            return "試行回数が多すぎます。しばらく待ってください。";


        case "auth/network-request-failed":

            return "ネットワーク接続を確認してください。";


        default:

            return (
                "認証エラーが発生しました。"
            );

    }

}


/* =====================================================
   ログイン処理中表示
===================================================== */

function setLoginLoading(
    loading
) {

    const loadingElement =
        document.getElementById(
            "loginLoading"
        );


    const loginButton =
        document.getElementById(
            "loginButton"
        );


    const registerButton =
        document.getElementById(
            "registerButton"
        );


    if (loadingElement) {

        loadingElement.style.display =
            loading
                ? "block"
                : "none";

    }


    if (loginButton) {

        loginButton.disabled =
            loading;

    }


    if (registerButton) {

        registerButton.disabled =
            loading;

    }

}


/* =====================================================
   ログアウトボタン
===================================================== */

function createLogoutButton() {

    if (!currentUser) {

        return;

    }


    let button =
        document.getElementById(
            "logoutButton"
        );


    if (button) {

        updateUserDisplay();

        return;

    }


    button =
        document.createElement(
            "button"
        );


    button.id =
        "logoutButton";


    button.textContent =
        "🚪 ログアウト";


    button.style.position =
        "fixed";

    button.style.top =
        "15px";

    button.style.right =
        "15px";

    button.style.zIndex =
        "9999";

    button.style.padding =
        "9px 13px";

    button.style.border =
        "none";

    button.style.borderRadius =
        "10px";

    button.style.background =
        "#111827";

    button.style.color =
        "white";

    button.style.fontWeight =
        "bold";

    button.style.fontSize =
        "12px";

    button.style.cursor =
        "pointer";


    button.onclick =
        logoutUser;


    document.body.appendChild(
        button
    );


    updateUserDisplay();

}


/* =====================================================
   ユーザー表示
===================================================== */

function updateUserDisplay() {

    if (!currentUser) {

        return;

    }


    let element =
        document.getElementById(
            "userAccountDisplay"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "userAccountDisplay";


        element.style.position =
            "fixed";

        element.style.top =
            "55px";

        element.style.right =
            "15px";

        element.style.zIndex =
            "9998";

        element.style.padding =
            "5px 9px";

        element.style.borderRadius =
            "8px";

        element.style.background =
            "rgba(255,255,255,0.92)";

        element.style.color =
            "#374151";

        element.style.fontSize =
            "10px";

        document.body.appendChild(
            element
        );

    }


    element.textContent =
        currentUser.email || "";

}


/* =====================================================
   ログアウト
===================================================== */

async function logoutUser() {

    if (!auth) return;


    if (
        !confirm(
            "ログアウトしますか？"
        )
    ) {

        return;

    }


    try {

        await signOut(auth);

    }
    catch (error) {

        console.error(
            "ログアウトエラー:",
            error
        );

    }

}


/* =====================================================
   ログイン画面表示 / 非表示
===================================================== */

function showLoginScreen() {

    const overlay =
        createLoginScreen();


    overlay.style.display =
        "flex";


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    const userDisplay =
        document.getElementById(
            "userAccountDisplay"
        );


    if (logoutButton) {

        logoutButton.remove();

    }


    if (userDisplay) {

        userDisplay.remove();

    }

}


function hideLoginScreen() {

    const overlay =
        document.getElementById(
            "loginOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =====================================================
   Firestore保存
===================================================== */

async function saveToCloud() {

    const cloudDataRef =
        getCloudDataRef();


    if (!cloudDataRef) {

        return false;

    }


    if (cloudSaving) {

        return false;

    }


    cloudSaving = true;


    try {

        await setDoc(

            cloudDataRef,

            {

                data:
                    structuredClone(
                        data
                    ),

                updatedAt:
                    new Date()
                        .toISOString()

            }

        );


        console.log(
            "☁️ Firestore保存成功"
        );


        showCloudStatus(
            "☁️ クラウド保存済み"
        );


        return true;

    }
    catch (error) {

        console.error(
            "Firestore保存エラー:",
            error
        );


        showCloudStatus(
            "📱 ローカル保存済み"
        );


        return false;

    }
    finally {

        cloudSaving = false;

    }

}


/* =====================================================
   Firestore読み込み
===================================================== */

async function loadFromCloud() {

    const cloudDataRef =
        getCloudDataRef();


    if (!cloudDataRef) {

        return;

    }


    cloudLoading = true;


    try {

        const snapshot =
            await getDoc(
                cloudDataRef
            );


        if (snapshot.exists()) {

            const cloud =
                snapshot.data();


            if (cloud.data) {

                data =
                    cloud.data;


                normalizeData(
                    data
                );


                saveLocalOnly();


                console.log(
                    "☁️ クラウドデータ読み込み成功"
                );


                showCloudStatus(
                    "☁️ クラウドデータを読み込みました"
                );

            }

        }
        else {

            /*
                初回ログイン時。
                現在のローカルデータを
                ユーザー専用クラウドへ保存
            */

            await saveToCloud();

        }

    }
    catch (error) {

        console.error(
            "Firestore読み込みエラー:",
            error
        );


        showCloudStatus(
            "📱 オフラインモード"
        );

    }
    finally {

        cloudLoading = false;

    }

}


/* =====================================================
   通常保存
===================================================== */

function saveData() {

    saveLocalOnly();


    if (
        firebaseReady &&
        currentUser &&
        !cloudLoading
    ) {

        saveToCloud();

    }


    updateOverallFinance();

}


/* =====================================================
   現在の会計
===================================================== */

function getCurrentEvent() {

    return data.events.find(
        event =>
            event.id ===
            data.currentEventId
    );

}


/* =====================================================
   全画面再描画
===================================================== */

function renderAll() {

    renderEvents();

    renderGroups();

    renderGroupFilter();

    renderMembers();

    renderFinance();

    updateStats();

    updateOverallFinance();

    calculateCustom();

}


/* =====================================================
   会計表示
===================================================== */

function renderEvents() {

    const container =
        document.getElementById(
            "eventList"
        );


    if (!container) return;


    container.innerHTML = "";


    data.events.forEach(
        event => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card " +
                (
                    event.id ===
                    data.currentEventId
                        ? "active"
                        : ""
                );


            card.onclick = () => {

                data.currentEventId =
                    event.id;

                saveData();

                renderAll();

            };


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "event-name";

            name.textContent =
                event.name;


            const fee =
                document.createElement(
                    "div"
                );

            fee.className =
                "event-fee";

            fee.textContent =
                "参加費 ¥" +
                Number(
                    event.fee
                ).toLocaleString();


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-event";

            deleteButton.textContent =
                "×";


            deleteButton.onclick =
                e => {

                    e.stopPropagation();

                    deleteEvent(
                        event.id
                    );

                };


            card.appendChild(name);

            card.appendChild(fee);

            card.appendChild(
                deleteButton
            );


            container.appendChild(
                card
            );

        }
    );


    const currentEvent =
        getCurrentEvent();


    if (currentEvent) {

        const eventName =
            document.getElementById(
                "currentEventName"
            );


        const currentFee =
            document.getElementById(
                "currentFee"
            );


        if (eventName) {

            eventName.textContent =
                currentEvent.name;

        }


        if (currentFee) {

            currentFee.textContent =
                "¥" +
                Number(
                    currentEvent.fee
                ).toLocaleString();

        }

    }

}


/* =====================================================
   会計追加
===================================================== */

function addEvent() {

    const name =
        prompt(
            "会計の目的を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const feeInput =
        prompt(
            "1人あたりの金額を入力してください",
            "3000"
        );


    const fee =
        Number(feeInput);


    if (
        !Number.isFinite(fee) ||
        fee < 0
    ) {

        alert(
            "金額を正しく入力してください"
        );

        return;

    }


    const newEvent = {

        id:
            Date.now(),

        name:
            name.trim(),

        fee:
            fee,

        members: {},

        income: [],

        expenses: []

    };


    data.events.push(
        newEvent
    );


    data.currentEventId =
        newEvent.id;


    saveData();

    renderAll();

}


/* =====================================================
   会計削除
===================================================== */

function deleteEvent(id) {

    if (
        data.events.length <= 1
    ) {

        alert(
            "会計は最低1つ必要です"
        );

        return;

    }


    const event =
        data.events.find(
            e =>
                e.id === id
        );


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」を削除しますか？`
        )
    ) return;


    data.events =
        data.events.filter(
            e =>
                e.id !== id
        );


    if (
        data.currentEventId === id
    ) {

        data.currentEventId =
            data.events[0].id;

    }


    saveData();

    renderAll();

}


/* =====================================================
   グループ表示
===================================================== */

function renderGroups() {

    const container =
        document.getElementById(
            "groupList"
        );


    if (!container) return;


    container.innerHTML = "";


    data.groups.forEach(
        group => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "group-card";


            const color =
                document.createElement(
                    "div"
                );

            color.className =
                "group-color";

            color.style.background =
                group.color;


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "group-name";

            name.textContent =
                group.name;


            const count =
                data.members.filter(
                    member =>
                        member.groupId ===
                        group.id
                ).length;


            const countElement =
                document.createElement(
                    "span"
                );

            countElement.className =
                "group-count";

            countElement.textContent =
                count + "人";


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "group-delete";

            deleteButton.textContent =
                "×";


            if (
                group.id === 1
            ) {

                deleteButton.style.display =
                    "none";

            }


            deleteButton.onclick =
                () => {

                    deleteGroup(
                        group.id
                    );

                };


            card.appendChild(color);

            card.appendChild(name);

            card.appendChild(
                countElement
            );

            card.appendChild(
                deleteButton
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   グループ追加
===================================================== */

function addGroup() {

    const name =
        prompt(
            "グループ名を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const colors = [

        "#dbeafe",
        "#dcfce7",
        "#fef3c7",
        "#fce7f3",
        "#ede9fe",
        "#cffafe",
        "#ffedd5",
        "#e2e8f0"

    ];


    const newGroup = {

        id:
            Date.now(),

        name:
            name.trim(),

        color:
            colors[
                data.groups.length %
                colors.length
            ]

    };


    data.groups.push(
        newGroup
    );


    saveData();

    renderAll();

}


/* =====================================================
   グループ削除
===================================================== */

function deleteGroup(id) {

    if (id === 1) {

        alert(
            "未所属グループは削除できません"
        );

        return;

    }


    const group =
        data.groups.find(
            g =>
                g.id === id
        );


    if (!group) return;


    if (
        !confirm(
            `「${group.name}」を削除しますか？`
        )
    ) return;


    data.members.forEach(
        member => {

            if (
                member.groupId === id
            ) {

                member.groupId = 1;

            }

        }
    );


    data.groups =
        data.groups.filter(
            group =>
                group.id !== id
        );


    saveData();

    renderAll();

}


/* =====================================================
   グループフィルター
===================================================== */

let selectedGroupFilter =
    "all";


function renderGroupFilter() {

    const container =
        document.getElementById(
            "groupFilter"
        );


    if (!container) return;


    container.innerHTML = "";


    const allButton =
        document.createElement(
            "button"
        );


    allButton.className =
        "filter-btn " +
        (
            selectedGroupFilter === "all"
                ? "active"
                : ""
        );


    allButton.textContent =
        "全員";


    allButton.onclick = () => {

        selectedGroupFilter =
            "all";

        renderGroupFilter();

        renderMembers();

    };


    container.appendChild(
        allButton
    );


    data.groups.forEach(
        group => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "filter-btn " +
                (
                    selectedGroupFilter ===
                    group.id
                        ? "active"
                        : ""
                );


            button.textContent =
                group.name;


            button.onclick = () => {

                selectedGroupFilter =
                    group.id;

                renderGroupFilter();

                renderMembers();

            };


            container.appendChild(
                button
            );

        }
    );

}


/* =====================================================
   メンバー表示
===================================================== */

function renderMembers() {

    const container =
        document.getElementById(
            "memberList"
        );


    if (!container) return;


    container.innerHTML = "";


    const event =
        getCurrentEvent();


    if (!event) return;


    let members =
        [...data.members];


    if (
        selectedGroupFilter !== "all"
    ) {

        members =
            members.filter(
                member =>
                    member.groupId ===
                    selectedGroupFilter
            );

    }


    members.forEach(
        member => {

            const status =
                event.members[
                    member.id
                ] || "unpaid";


            const group =
                data.groups.find(
                    group =>
                        group.id ===
                        member.groupId
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "member-card";


            if (group) {

                card.classList.add(
                    "group-colored"
                );

                card.style.setProperty(
                    "--group-color",
                    group.color
                );

            }


            if (status === "paid") {

                card.classList.add(
                    "paid"
                );

            }


            if (status === "absent") {

                card.classList.add(
                    "absent"
                );

            }


            card.onclick =
                e => {

                    if (
                        e.target.tagName ===
                        "BUTTON"
                    ) return;

                    togglePayment(
                        member.id
                    );

                };


            if (group) {

                const groupLabel =
                    document.createElement(
                        "div"
                    );

                groupLabel.className =
                    "member-group";

                groupLabel.style.setProperty(
                    "--group-color",
                    group.color
                );

                groupLabel.textContent =
                    group.name;

                card.appendChild(
                    groupLabel
                );

            }


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "member-name";

            name.textContent =
                member.name;

            card.appendChild(name);


            const statusText =
                document.createElement(
                    "div"
                );

            statusText.className =
                "member-status";


            if (status === "paid") {

                statusText.textContent =
                    "✓ 支払い済み";

            }
            else if (status === "absent") {

                statusText.textContent =
                    "— 不参加";

            }
            else {

                statusText.textContent =
                    "未払い";

            }


            card.appendChild(
                statusText
            );


            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "member-actions";


            const editButton =
                document.createElement(
                    "button"
                );

            editButton.className =
                "group-btn";

            editButton.textContent =
                "名前変更";

            editButton.onclick =
                () =>
                    renameMember(
                        member.id
                    );


            const absentButton =
                document.createElement(
                    "button"
                );

            absentButton.className =
                "absent-btn";

            absentButton.textContent =
                status === "absent"
                    ? "参加に戻す"
                    : "不参加";

            absentButton.onclick =
                () =>
                    toggleAttendance(
                        member.id
                    );


            const groupButton =
                document.createElement(
                    "button"
                );

            groupButton.className =
                "group-btn";

            groupButton.textContent =
                "グループ";

            groupButton.onclick =
                () =>
                    changeMemberGroup(
                        member.id
                    );


            const upButton =
                document.createElement(
                    "button"
                );

            upButton.className =
                "sort-btn";

            upButton.textContent =
                "↑";

            upButton.onclick =
                () =>
                    moveMember(
                        member.id,
                        -1
                    );


            const downButton =
                document.createElement(
                    "button"
                );

            downButton.className =
                "sort-btn";

            downButton.textContent =
                "↓";

            downButton.onclick =
                () =>
                    moveMember(
                        member.id,
                        1
                    );


            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-member";

            deleteButton.textContent =
                "削除";

            deleteButton.onclick =
                () =>
                    deleteMember(
                        member.id
                    );


            actions.appendChild(
                editButton
            );

            actions.appendChild(
                absentButton
            );

            actions.appendChild(
                groupButton
            );

            actions.appendChild(
                upButton
            );

            actions.appendChild(
                downButton
            );

            actions.appendChild(
                deleteButton
            );


            card.appendChild(
                actions
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   名前変更
===================================================== */

function renameMember(memberId) {

    const member =
        data.members.find(
            m =>
                m.id === memberId
        );


    if (!member) return;


    const newName =
        prompt(
            "新しい名前を入力してください",
            member.name
        );


    if (
        !newName ||
        !newName.trim()
    ) return;


    member.name =
        newName.trim();


    saveData();

    renderAll();

}


/* =====================================================
   メンバー順番変更
===================================================== */

function moveMember(
    memberId,
    direction
) {

    const index =
        data.members.findIndex(
            member =>
                member.id === memberId
        );


    if (index === -1) return;


    const newIndex =
        index + direction;


    if (
        newIndex < 0 ||
        newIndex >= data.members.length
    ) {

        return;

    }


    [
        data.members[index],
        data.members[newIndex]
    ] =
    [
        data.members[newIndex],
        data.members[index]
    ];


    saveData();

    renderMembers();

}


/* =====================================================
   名前順
===================================================== */

function sortMembersByName() {

    if (
        !confirm(
            "メンバーを名前順に並べ替えますか？"
        )
    ) return;


    data.members.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "ja"
            )
    );


    saveData();

    renderMembers();

}


/* =====================================================
   一括不参加
===================================================== */

function bulkAbsent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const targetMembers =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    member.groupId ===
                    selectedGroupFilter
            );


    if (
        targetMembers.length === 0
    ) {

        alert(
            "対象となるメンバーがいません"
        );

        return;

    }


    const targetName =
        selectedGroupFilter === "all"

            ? "全員"

            : (
                data.groups.find(
                    group =>
                        group.id ===
                        selectedGroupFilter
                )?.name ||
                "選択グループ"
            );


    if (
        !confirm(
            `${targetName}を一括で不参加にしますか？`
        )
    ) return;


    targetMembers.forEach(
        member => {

            event.members[
                member.id
            ] = "absent";

        }
    );


    saveData();

    renderMembers();

    updateStats();

}


/* =====================================================
   全員参加
===================================================== */

function bulkPresent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const targetMembers =
        selectedGroupFilter === "all"

            ? [...data.members]

            : data.members.filter(
                member =>
                    member.groupId ===
                    selectedGroupFilter
            );


    if (
        targetMembers.length === 0
    ) return;


    if (
        !confirm(
            "対象メンバーを参加に戻しますか？"
        )
    ) return;


    targetMembers.forEach(
        member => {

            event.members[
                member.id
            ] = "unpaid";

        }
    );


    saveData();

    renderMembers();

    updateStats();

}


/* =====================================================
   グループ変更
===================================================== */

function changeMemberGroup(memberId) {

    const member =
        data.members.find(
            m =>
                m.id === memberId
        );


    if (!member) return;


    if (
        data.groups.length <= 1
    ) {

        alert(
            "先にグループを追加してください"
        );

        return;

    }


    let message =
        "所属するグループを番号で選択してください\n\n";


    data.groups.forEach(
        (group, index) => {

            message +=
                `${index + 1}. ${group.name}\n`;

        }
    );


    const answer =
        prompt(message);


    if (!answer) return;


    const index =
        Number(answer) - 1;


    if (
        !Number.isInteger(index) ||
        !data.groups[index]
    ) {

        alert(
            "正しい番号を入力してください"
        );

        return;

    }


    member.groupId =
        data.groups[index].id;


    saveData();

    renderAll();

}


/* =====================================================
   支払い
===================================================== */

function togglePayment(memberId) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] || "unpaid";


    if (
        current === "absent"
    ) {

        alert(
            "先に「参加に戻す」を押してください"
        );

        return;

    }


    event.members[
        memberId
    ] =
        current === "unpaid"
            ? "paid"
            : "unpaid";


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   参加 / 不参加
===================================================== */

function toggleAttendance(memberId) {

    const event =
        getCurrentEvent();


    if (!event) return;


    const current =
        event.members[
            memberId
        ] || "unpaid";


    event.members[
        memberId
    ] =
        current === "absent"
            ? "unpaid"
            : "absent";


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   メンバー追加
===================================================== */

function addMember() {

    const name =
        prompt(
            "メンバーの名前を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const newMember = {

        id:
            Date.now(),

        name:
            name.trim(),

        groupId:
            1

    };


    data.members.push(
        newMember
    );


    data.events.forEach(
        event => {

            if (!event.members) {

                event.members = {};

            }

            event.members[
                newMember.id
            ] = "unpaid";

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   メンバー削除
===================================================== */

function deleteMember(id) {

    const member =
        data.members.find(
            m =>
                m.id === id
        );


    if (!member) return;


    if (
        !confirm(
            `${member.name}を削除しますか？`
        )
    ) return;


    data.members =
        data.members.filter(
            m =>
                m.id !== id
        );


    data.events.forEach(
        event => {

            if (event.members) {

                delete event.members[id];

            }

        }
    );


    saveData();

    renderAll();

}


/* =====================================================
   統計
===================================================== */

function updateStats() {

    const event =
        getCurrentEvent();


    if (!event) return;


    let participants = 0;
    let paid = 0;
    let unpaid = 0;
    let absent = 0;


    data.members.forEach(
        member => {

            const status =
                event.members[
                    member.id
                ] || "unpaid";


            if (status === "absent") {

                absent++;

            }
            else {

                participants++;


                if (status === "paid") {

                    paid++;

                }
                else {

                    unpaid++;

                }

            }

        }
    );


    const collected =
        paid *
        Number(event.fee || 0);


    const remaining =
        unpaid *
        Number(event.fee || 0);


    const participantElement =
        document.getElementById(
            "participantCount"
        );


    const paidElement =
        document.getElementById(
            "paidCount"
        );


    const unpaidElement =
        document.getElementById(
            "unpaidCount"
        );


    const absentElement =
        document.getElementById(
            "absentCount"
        );


    const collectedElement =
        document.getElementById(
            "collectedMoney"
        );


    const remainingElement =
        document.getElementById(
            "remainingMoney"
        );


    if (participantElement)
        participantElement.textContent =
            participants + "人";


    if (paidElement)
        paidElement.textContent =
            paid + "人";


    if (unpaidElement)
        unpaidElement.textContent =
            unpaid + "人";


    if (absentElement)
        absentElement.textContent =
            absent + "人";


    if (collectedElement)
        collectedElement.textContent =
            "¥" +
            collected.toLocaleString();


    if (remainingElement)
        remainingElement.textContent =
            "¥" +
            remaining.toLocaleString();

}


/* =====================================================
   収入追加
===================================================== */

function addIncome() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const name =
        prompt(
            "収入の内容を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const amount =
        Number(
            prompt(
                "金額を入力してください"
            )
        );


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    event.income.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount:
            amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

}


/* =====================================================
   支出追加
===================================================== */

function addExpense() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const name =
        prompt(
            "支出の内容を入力してください"
        );


    if (
        !name ||
        !name.trim()
    ) return;


    const amount =
        Number(
            prompt(
                "金額を入力してください"
            )
        );


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    event.expenses.push({

        id:
            Date.now(),

        name:
            name.trim(),

        amount:
            amount,

        date:
            new Date()
                .toLocaleDateString(
                    "ja-JP"
                )

    });


    saveData();

    renderFinance();

}


/* =====================================================
   会計表示
===================================================== */

function renderFinance() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (!event.income)
        event.income = [];


    if (!event.expenses)
        event.expenses = [];


    const participationList =
        document.getElementById(
            "participationIncomeList"
        );


    const incomeList =
        document.getElementById(
            "incomeList"
        );


    const expenseList =
        document.getElementById(
            "expenseList"
        );


    if (participationList)
        participationList.innerHTML = "";


    if (incomeList)
        incomeList.innerHTML = "";


    if (expenseList)
        expenseList.innerHTML = "";


    let paidCount = 0;


    Object.entries(
        event.members || {}
    ).forEach(
        ([memberId, status]) => {

            if (status !== "paid")
                return;


            paidCount++;


            const member =
                data.members.find(
                    m =>
                        String(m.id) ===
                        String(memberId)
                );


            if (
                participationList &&
                member
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "finance-item";


                const left =
                    document.createElement(
                        "div"
                    );


                left.className =
                    "finance-item-left";


                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "finance-item-name";


                name.textContent =
                    member.name;


                const date =
                    document.createElement(
                        "span"
                    );


                date.className =
                    "finance-item-date";


                date.textContent =
                    "参加費";


                left.appendChild(name);

                left.appendChild(date);


                const right =
                    document.createElement(
                        "div"
                    );


                right.className =
                    "finance-item-right";


                const amount =
                    document.createElement(
                        "span"
                    );


                amount.className =
                    "finance-item-amount income-amount";


                amount.textContent =
                    "+ ¥" +
                    Number(event.fee)
                        .toLocaleString();


                right.appendChild(
                    amount
                );


                item.appendChild(left);

                item.appendChild(right);


                participationList.appendChild(
                    item
                );

            }

        }
    );


    const participationIncome =
        paidCount *
        (
            Number(event.fee) || 0
        );


    let otherIncome = 0;


    event.income.forEach(
        item => {

            otherIncome +=
                Number(item.amount) || 0;


            if (incomeList) {

                incomeList.appendChild(
                    createFinanceItem(
                        item,
                        "income"
                    )
                );

            }

        }
    );


    let expenseTotal = 0;


    event.expenses.forEach(
        item => {

            expenseTotal +=
                Number(item.amount) || 0;


            if (expenseList) {

                expenseList.appendChild(
                    createFinanceItem(
                        item,
                        "expense"
                    )
                );

            }

        }
    );


    const totalIncome =
        participationIncome +
        otherIncome;


    const balance =
        totalIncome -
        expenseTotal;


    const participationElement =
        document.getElementById(
            "participationIncomeTotal"
        );


    const otherIncomeElement =
        document.getElementById(
            "otherIncomeTotal"
        );


    const expenseElement =
        document.getElementById(
            "expenseTotal"
        );


    const balanceElement =
        document.getElementById(
            "balanceTotal"
        );


    if (participationElement)
        participationElement.textContent =
            "¥" +
            participationIncome.toLocaleString();


    if (otherIncomeElement)
        otherIncomeElement.textContent =
            "¥" +
            otherIncome.toLocaleString();


    if (expenseElement)
        expenseElement.textContent =
            "¥" +
            expenseTotal.toLocaleString();


    if (balanceElement)
        balanceElement.textContent =
            "¥" +
            balance.toLocaleString();


    updateOverallFinance();

}


/* =====================================================
   収支項目
===================================================== */

function createFinanceItem(
    item,
    type
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "finance-item";


    const left =
        document.createElement(
            "div"
        );


    left.className =
        "finance-item-left";


    const name =
        document.createElement(
            "span"
        );


    name.className =
        "finance-item-name";


    name.textContent =
        item.name;


    const date =
        document.createElement(
            "span"
        );


    date.className =
        "finance-item-date";


    date.textContent =
        item.date;


    left.appendChild(name);

    left.appendChild(date);


    const right =
        document.createElement(
            "div"
        );


    right.className =
        "finance-item-right";


    const amount =
        document.createElement(
            "span"
        );


    amount.className =
        "finance-item-amount " +
        (
            type === "income"
                ? "income-amount"
                : "expense-amount"
        );


    amount.textContent =
        (
            type === "income"
                ? "+ ¥"
                : "- ¥"
        ) +
        Number(item.amount)
            .toLocaleString();


    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.className =
        "delete-finance";


    deleteButton.textContent =
        "×";


    deleteButton.onclick =
        () => {

            deleteFinanceItem(
                type,
                item.id
            );

        };


    right.appendChild(amount);

    right.appendChild(
        deleteButton
    );


    element.appendChild(left);

    element.appendChild(right);


    return element;

}


/* =====================================================
   収支削除
===================================================== */

function deleteFinanceItem(
    type,
    id
) {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (type === "income") {

        event.income =
            event.income.filter(
                item =>
                    item.id !== id
            );

    }
    else {

        event.expenses =
            event.expenses.filter(
                item =>
                    item.id !== id
            );

    }


    saveData();

    renderFinance();

}


/* =====================================================
   計算機
===================================================== */

function calculateCustom() {

    const peopleElement =
        document.getElementById(
            "calcPeople"
        );


    const totalElement =
        document.getElementById(
            "calcTotal"
        );


    const resultElement =
        document.getElementById(
            "calcPerPerson"
        );


    if (
        !peopleElement ||
        !totalElement ||
        !resultElement
    ) return;


    const people =
        Number(
            peopleElement.value
        );


    const total =
        Number(
            totalElement.value
        );


    let result = 0;


    if (people > 0) {

        result =
            Math.ceil(
                total / people
            );

    }


    resultElement.textContent =
        "¥" +
        result.toLocaleString();

}


/* =====================================================
   現在の会計リセット
===================================================== */

function resetCurrentEvent() {

    const event =
        getCurrentEvent();


    if (!event) return;


    if (
        !confirm(
            `「${event.name}」の支払い状況を全て未払いに戻しますか？`
        )
    ) return;


    event.members = {};


    saveData();

    renderMembers();

    updateStats();

    renderFinance();

}


/* =====================================================
   全データ削除
===================================================== */

async function resetAllData() {

    if (
        !confirm(
            "全てのデータを削除します。\n本当に削除しますか？"
        )
    ) return;


    data =
        structuredClone(
            DEFAULT_DATA
        );


    saveLocalOnly();


    const cloudDataRef =
        getCloudDataRef();


    if (cloudDataRef) {

        try {

            await setDoc(

                cloudDataRef,

                {

                    data:
                        structuredClone(
                            DEFAULT_DATA
                        ),

                    updatedAt:
                        new Date()
                            .toISOString()

                }

            );

        }
        catch (error) {

            console.error(
                "Firebaseリセットエラー:",
                error
            );

        }

    }


    location.reload();

}


/* =====================================================
   バックアップ
===================================================== */

function exportData() {

    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        "CircleAccounting_backup.json";


    document.body.appendChild(a);

    a.click();

    a.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        100
    );

}


/* =====================================================
   復元
===================================================== */

function importData(event) {

    const file =
        event.target.files[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload =
        async e => {

            try {

                const imported =
                    JSON.parse(
                        e.target.result
                    );


                if (
                    !imported.events ||
                    !imported.members
                ) {

                    throw new Error(
                        "Invalid backup"
                    );

                }


                if (
                    !confirm(
                        "現在のデータをバックアップデータに置き換えますか？"
                    )
                ) {

                    return;

                }


                data =
                    imported;


                normalizeData(
                    data
                );


                saveLocalOnly();


                await saveToCloud();


                alert(
                    "データを復元しました！"
                );


                renderAll();

            }
            catch (error) {

                console.error(
                    error
                );


                alert(
                    "バックアップファイルを読み込めませんでした。"
                );

            }

        };


    reader.readAsText(file);

}


/* =====================================================
   参加費変更
===================================================== */

function changeFee() {

    const event =
        getCurrentEvent();


    if (!event) return;


    const input =
        prompt(
            "新しい参加費を入力してください",
            event.fee
        );


    if (
        input === null
    ) return;


    const newFee =
        Number(input);


    if (
        !Number.isFinite(newFee) ||
        newFee < 0
    ) {

        alert(
            "正しい金額を入力してください"
        );

        return;

    }


    if (
        !confirm(
            `参加費を ¥${Number(event.fee).toLocaleString()} から ¥${newFee.toLocaleString()} に変更しますか？`
        )
    ) {

        return;

    }


    event.fee =
        newFee;


    saveData();

    renderAll();

}


/* =====================================================
   サークル全体の会計
===================================================== */

function updateOverallFinance() {

    let totalParticipationIncome = 0;

    let totalOtherIncome = 0;

    let totalExpense = 0;


    data.events.forEach(
        event => {

            let paidCount = 0;


            Object.values(
                event.members || {}
            ).forEach(
                status => {

                    if (
                        status === "paid"
                    ) {

                        paidCount++;

                    }

                }
            );


            totalParticipationIncome +=

                paidCount *
                (
                    Number(event.fee) || 0
                );


            (
                event.income || []
            ).forEach(
                item => {

                    totalOtherIncome +=
                        Number(
                            item.amount
                        ) || 0;

                }
            );


            (
                event.expenses || []
            ).forEach(
                item => {

                    totalExpense +=
                        Number(
                            item.amount
                        ) || 0;

                }
            );

        }
    );


    const totalIncome =
        totalParticipationIncome +
        totalOtherIncome;


    const balance =
        totalIncome -
        totalExpense;


    const incomeElement =
        document.getElementById(
            "overallIncome"
        );


    const expenseElement =
        document.getElementById(
            "overallExpense"
        );


    const balanceElement =
        document.getElementById(
            "overallBalance"
        );


    if (incomeElement) {

        incomeElement.textContent =
            "¥" +
            totalIncome.toLocaleString();

    }


    if (expenseElement) {

        expenseElement.textContent =
            "¥" +
            totalExpense.toLocaleString();

    }


    if (balanceElement) {

        balanceElement.textContent =
            "¥" +
            balance.toLocaleString();

    }

}


/* =====================================================
   Authentication状態監視
===================================================== */

let firstAuthCheck = true;


function setupAuthentication() {

    if (!auth) {

        console.error(
            "Firebase Authenticationを初期化できませんでした"
        );

        return;

    }


    createLoginScreen();


    onAuthStateChanged(
        auth,
        async user => {

            console.log(
                "🔐 Authentication状態:",
                user
                    ? user.email
                    : "ログアウト"
            );


            if (!user) {

                currentUser = null;

                showLoginScreen();

                return;

            }


            currentUser =
                user;


            console.log(
                "👤 ログインユーザー:",
                user.uid
            );


            hideLoginScreen();

            createLogoutButton();


            /*
                ユーザー専用LocalStorageを読み込む
            */

            const localKey =
                getLocalStorageKey();


            const localSaved =
                localStorage.getItem(
                    localKey
                );


            if (localSaved) {

                try {

                    data =
                        JSON.parse(
                            localSaved
                        );

                    normalizeData(
                        data
                    );

                }
                catch (error) {

                    console.error(
                        "ユーザーローカルデータ読み込みエラー:",
                        error
                    );

                    data =
                        structuredClone(
                            DEFAULT_DATA
                        );

                }

            }
            else {

                data =
                    structuredClone(
                        DEFAULT_DATA
                    );

            }


            /*
                まずローカルデータを表示
            */

            renderAll();


            /*
                Firestoreから最新データを取得
            */

            await loadFromCloud();


            /*
                クラウド取得後に再描画
            */

            renderAll();


            showCloudStatus(
                "☁️ ログイン・クラウド接続完了"
            );


            firstAuthCheck = false;

        }
    );

}


/* =====================================================
   HTML onclick対応
===================================================== */

window.addEvent =
    addEvent;

window.deleteEvent =
    deleteEvent;

window.addGroup =
    addGroup;

window.deleteGroup =
    deleteGroup;

window.addMember =
    addMember;

window.deleteMember =
    deleteMember;

window.renameMember =
    renameMember;

window.moveMember =
    moveMember;

window.sortMembersByName =
    sortMembersByName;

window.bulkAbsent =
    bulkAbsent;

window.bulkPresent =
    bulkPresent;

window.changeMemberGroup =
    changeMemberGroup;

window.togglePayment =
    togglePayment;

window.toggleAttendance =
    toggleAttendance;

window.addIncome =
    addIncome;

window.addExpense =
    addExpense;

window.deleteFinanceItem =
    deleteFinanceItem;

window.calculateCustom =
    calculateCustom;

window.resetCurrentEvent =
    resetCurrentEvent;

window.resetAllData =
    resetAllData;

window.exportData =
    exportData;

window.importData =
    importData;

window.changeFee =
    changeFee;

window.logoutUser =
    logoutUser;


/* =====================================================
   起動
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🚀 Circle Accounting 起動"
        );


        if (!firebaseReady) {

            console.error(
                "Firebaseが利用できません"
            );

            renderAll();

            return;

        }


        setupAuthentication();

    }
);