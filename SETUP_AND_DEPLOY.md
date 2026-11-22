# SkillSwap: Setup se Live tak (Step by Step)

Ye guide shuru se aakhir tak sab kuch batati hai: laptop pe chalana, database connect karna, GitHub pe code daalna, aur internet pe live karna. Har step me commands diye hain.

**Sabse pehle ek baat:** live karne ke liye **code me kuch badalna nahi padta.** Database ka link, secrets aur admin email sirf **environment variables** me jaate hain (local me `server/.env` file me, live me Render ke dashboard me). Code ke andar kabhi password mat likhna, kyunki code GitHub pe jata hai.

---

## Poora raasta ek nazar me

| Stage | Kya karna hai | Kahan |
|---|---|---|
| 1 | Zaroori software install | Laptop |
| 2 | App local me chalana (local MongoDB ke saath) | Laptop |
| 3 | Cloud database banana (MongoDB Atlas) | atlas website |
| 4 | Code GitHub pe daalna | Laptop → GitHub |
| 5 | Render pe live karna | Render website |
| 6 | Live hone ke baad admin banana aur check karna | Tumhari live site |

---

## 1. Zaroori software

| Software | Kyun | Kaise check karein |
|---|---|---|
| **Node.js 18 ya naya** (20 best) | App chalane ke liye | `node -v` |
| **MongoDB Community** (local database) | Laptop pe testing ke liye | `Get-Service MongoDB` me status `Running` |
| **Git** | Code GitHub pe bhejne ke liye | `git --version` |
| **MongoDB Compass** (optional) | Database ka data dekhne ke liye | App kholo, `mongodb://127.0.0.1:27017` se connect |

Check karne ke commands (PowerShell):

```powershell
node -v
```
```powershell
git --version
```
```powershell
Get-Service MongoDB
```

Agar MongoDB service `Stopped` ho to:

```powershell
Start-Service MongoDB
```

---

## 2. Local me chalana

### 2.1 Project folder me jao

```powershell
cd "D:\My Projects\Claude Project\mini project"
```

Folder ke andar do hisse hain:
- `server/` : backend (Express + MongoDB)
- `client/` : frontend (React)

### 2.2 Packages install karo (ek baar)

```powershell
cd server
npm install
cd ..\client
npm install
cd ..
```

### 2.3 `.env` file banao (server ki settings)

`server/.env` file me ye hona chahiye. Agar nahi hai to `server/.env.example` copy karo:

```powershell
cd server
copy .env.example .env
```

Phir `server/.env` kholo aur ye likho:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/skillswap
JWT_SECRET=koi-bhi-lamba-random-text-yahan
ALLOWED_EMAIL_DOMAIN=
ADMIN_EMAILS=
```

Har line ka matlab:

| Line | Matlab |
|---|---|
| `PORT` | Server kis port pe chalega. Local me 5000 |
| `MONGO_URI` | Database ka address. Local me tumhare laptop ka MongoDB |
| `JWT_SECRET` | Login token ko lock karne ki chaabi. Koi bhi lamba random text |
| `ALLOWED_EMAIL_DOMAIN` | Khali = koi bhi email se signup. `bitmesra.ac.in` likhoge to sirf wahi emails (sirf pehli baar ke liye, baad me Admin → Settings se badalta hai) |
| `ADMIN_EMAILS` | Jin emails ko admin banana hai (comma se alag). Apna email likh sakte ho |

Ye file **GitHub pe kabhi nahi jati** (`.gitignore` me hai). Isliye iska sahi hona zaroori hai.

### 2.4 Chalao (do alag PowerShell windows)

**Window 1: backend**

```powershell
cd "D:\My Projects\Claude Project\mini project\server"
npm run dev
```

Ye dikhna chahiye:
```
MongoDB connected
SkillSwap running on port 5000 (development)
```

**Window 2: frontend**

```powershell
cd "D:\My Projects\Claude Project\mini project\client"
npm run dev
```

Browser me kholo: **http://localhost:5173**

Check: **http://localhost:5000/api/health** kholo, ye dikhna chahiye: `{"ok":true,"db":"connected"}`

### 2.5 Pehla admin banao

Pehle site pe **register** karo. Phir **ek** tareeka chuno:

**Tareeka A (command):**
```powershell
cd "D:\My Projects\Claude Project\mini project\server"
npm run make-admin -- tumhara-email@gmail.com
```

**Tareeka B (env):** `server/.env` me `ADMIN_EMAILS=tumhara-email@gmail.com` likho, backend restart karo, phir logout karke dobara login karo.

Ab navbar me **Admin** dikhega, ya seedha **http://localhost:5173/admin** kholo.

### 2.6 Demo data (optional, sirf local me)

Dummy students dekhne ho to:
```powershell
npm run seed
```
Login: `demo@bitmesra.ac.in` / `password123`

Demo data hatana ho:
```powershell
npm run clear-demo
```
Ya **Admin → Overview → Remove demo data**. Asli accounts kabhi nahi hatte.

### 2.7 Test chalao (backend chalta hua rakhna)

```powershell
cd "D:\My Projects\Claude Project\mini project\server"
npm test
```
Aakhir me `All checks passed` dikhna chahiye. Test apne bane hue accounts khud delete kar deta hai.

---

## 3. Cloud database: MongoDB Atlas

Live site laptop ke MongoDB se nahi chalegi. Uske liye cloud database chahiye. Atlas ka free plan (M0) kaafi hai.

1. **mongodb.com/atlas** pe jao aur Google se sign up karo.
2. **Create a deployment** → **M0 (Free)** → provider AWS, region **Mumbai (ap-south-1)** → **Create**.
3. **Database User banao:**
   - Left menu → **Database Access** → **Add New Database User**.
   - Username aur password daalo. Password me **sirf letters aur numbers**, 16 ya zyada characters. `@ : / #` jaise special characters mat rakho (link toot jata hai).
   - **Database User Privileges** me **Read and write to any database** chuno.
   - **Add User**.
   - Username kaisa likha hai (capital/small) wo note karo, ye **case-sensitive** hai.
4. **Network Access:**
   - Left menu → **Network Access** → **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`) → **Confirm**.
   - Ye zaroori hai kyunki Render ka IP badalta rehta hai. Suraksha password se aati hai.
5. **Connection link lo:**
   - **Database** → apne cluster ke saamne **Connect** → **Drivers** → link copy karo:
     ```
     mongodb+srv://USERNAME:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
6. **Link ko theek karo** (yahi sabse zyada galti hoti hai):
   - `<password>` ki jagah asli password likho, **brackets `< >` hata do**.
   - `.net/` ke baad aur `?` se pehle **database ka naam `skillswap`** jodo.

   Final link aisa dikhega:
   ```
   mongodb+srv://USERNAME:APNA_PASSWORD@cluster0.xxxxx.mongodb.net/skillswap?retryWrites=true&w=majority
   ```
   Ye tumhara **`MONGO_URI`** hai. Ise sirf Render me daalna hai. Chat, code ya GitHub me mat daalna.

> Local aur live ke database **alag** hote hain. Laptop pe banaye accounts live site pe nahi honge. Live site khali shuru hogi.

---

## 4. Code GitHub pe daalo

1. **github.com** pe repository banao (naam `skillswap`, **Private** rakho, README mat jodna).
2. Project folder me ye commands ek ek karke chalao:

```powershell
cd "D:\My Projects\Claude Project\mini project"
```
```powershell
git init
```
```powershell
git add .
```
3. **Zaroori check.** Ye chalao:
```powershell
git status
```
Hari list me `.env` ya `node_modules` **nahi** dikhna chahiye. Agar `.env` dikhe to **ruk jao** aur push mat karo.

4. Commit aur push (`<USERNAME>` ki jagah apna GitHub username):
```powershell
git commit -m "SkillSwap first version"
```
```powershell
git branch -M main
```
```powershell
git remote add origin https://github.com/<USERNAME>/skillswap.git
```
```powershell
git push -u origin main
```

Agar "Please tell me who you are" error aaye:
```powershell
git config --global user.name "Tumhara Naam"
git config --global user.email "tumhara-email@gmail.com"
```

---

## 5. Render pe live karo

1. **render.com** → **Sign up with GitHub** → apni repo ka access do.
2. **New +** → **Blueprint** → apni repo chuno → **Connect**. Render `render.yaml` apne aap padh leta hai.
3. Ye do values maangega:
   - **`MONGO_URI`** → Part 3 wala final link.
   - **`ADMIN_EMAILS`** → apna email (jisse admin banna hai).

   `JWT_SECRET` apne aap ban jata hai.
4. **Apply** dabao. Build me 3 se 6 minute lagte hain.
5. Logs me aakhir me ye dikhna chahiye:
   ```
   MongoDB connected
   SkillSwap running on port ... (production)
   ```
6. Upar tumhara link milega, jaise `https://skillswap-xxxx.onrender.com`.

**Agar Blueprint na chale** to **New + → Web Service** se banao:

| Setting | Value |
|---|---|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Environment variables | `NODE_ENV=production`, `NODE_VERSION=20`, `JWT_SECRET=` (kam se kam 16 random characters), `MONGO_URI=`, `ADMIN_EMAILS=` |

JWT secret banane ka command:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Live hone ke baad

1. `https://tumhara-link.onrender.com/api/health` kholo. Ye dikhna chahiye: `{"ok":true,"db":"connected"}`
2. Site kholo (khali hogi, ye normal hai).
3. **Register** karo, **wahi email** jo `ADMIN_EMAILS` me diya tha. Tum admin ho, **Admin** tab dikhega.
4. **Admin → Settings** me apni community ke hisaab se badlo: categories, programmes, departments, meeting services, signup domains, announcement.
5. Ek test skill daalo, doosre browser se doosra account banao, session book karke chat aur meeting link check karo.

**Agar admin nahi bana:** Local se command chala sakte ho jo live database pe kaam karegi:
```powershell
cd "D:\My Projects\Claude Project\mini project\server"
$env:MONGO_URI = "tumhara-atlas-link"
npm run make-admin -- tumhara-email@gmail.com
```
(Ye sirf us PowerShell window me rehta hai, file me save nahi hota.)

---

## 7. Baad me badlaav live karna

Code badlo, phir:

```powershell
cd "D:\My Projects\Claude Project\mini project"
git add .
git commit -m "kya badla likho"
git push
```

Render apne aap naya version live kar deta hai (2 se 5 minute). Settings jo Admin panel se badalti hain (categories wagairah), unke liye push ki zarurat nahi.

---

## 8. Code me kya kahan badalna hai

**Live karne ke liye:** kuch nahi. Ye sab sirf apni marzi ke badlaav ke liye hai.

| Kya badalna hai | Kahan |
|---|---|
| Site ka naam / logo text | `client/src/components/Navbar.jsx` (`Brand`), `client/src/pages/Landing.jsx` (footer), `client/index.html` (title, description) |
| Landing page ka text | `client/src/pages/Landing.jsx` |
| Login/signup page ka text | `client/src/pages/Auth.jsx` |
| Rang (colors) | `client/src/styles.css`, sabse upar `:root { ... }` me `--primary`, `--grad` wagairah |
| Categories, programmes, departments, topic suggestions, meeting services | **Admin → Settings** (code nahi). `server/src/constants.js` sirf **pehli baar** ke liye default hai. Database bann gaya to us file ko badalne se kuch nahi badlega |
| Match score ka formula (25/25/30/20) | `server/src/utils/matching.js` |
| Session ki length (1 se 4 ghante) | `server/src/routes/sessions.js` (validation) aur `client/src/pages/UserProfile.jsx` (dropdown) |
| Year ke options (1 se 5) | `client/src/pages/Auth.jsx`, `client/src/pages/Profile.jsx`, `server/src/routes/auth.js`, `server/src/routes/users.js` |
| Login kitne din chalega (7 din) | `server/src/routes/auth.js`, `expiresIn: '7d'` |
| Galat login ki limit (30 / 15 min), signup limit (40 / ghanta) | `server/src/index.js`, `limiter(...)` wali lines |
| Chat ki speed limit (20 message / minute), max length | `server/src/routes/messages.js` |
| Chat kitni der me refresh ho (5 second) | `client/src/components/Chat.jsx`, `setInterval(..., 5000)` |
| Guest ko naam kaise dikhe ("Riya S.") | `server/src/middleware/auth.js`, `maskName` |
| Report ke reasons | `server/src/models/Report.js` aur `client/src/components/ReportButton.jsx` |
| Seed ka demo data | `server/src/seed.js` (sirf local ke liye) |
| Render ka naam, Node version | `render.yaml` |
| Frontend ka local port / proxy | `client/vite.config.js` |
| Frontend alag jagah host karna ho | build karte time `VITE_API_URL`, aur server pe `CORS_ORIGIN` |

---

## 9. Environment variables

| Variable | Zaroori? | Matlab |
|---|---|---|
| `MONGO_URI` | Haan | Database ka link (local ya Atlas) |
| `JWT_SECRET` | Haan | 16+ random characters. Production me kamzor ya placeholder wala secret server accept nahi karta |
| `ADMIN_EMAILS` | Sifarish | Admin banne wale emails, comma se alag |
| `NODE_ENV` | Sifarish | Live me `production`. Isse rate limit aur security checks chalu hote hain |
| `PORT` | Nahi | Hosting khud set karti hai |
| `ALLOWED_EMAIL_DOMAIN` | Nahi | Sirf pehli baar ke liye. Baad me Admin → Settings → Sign-up |
| `CORS_ORIGIN` | Nahi | Sirf agar frontend alag domain pe ho |
| `DISABLE_RATE_LIMIT` | Nahi | Sirf debugging ke liye |

---

## 10. Commands ek jagah

| Kaam | Command | Kahan chalana hai |
|---|---|---|
| Backend dev mode | `npm run dev` | `server/` |
| Frontend dev mode | `npm run dev` | `client/` |
| Demo data daalna | `npm run seed` | `server/` |
| Demo data hatana | `npm run clear-demo` | `server/` |
| Admin banana | `npm run make-admin -- email@example.com` | `server/` |
| API tests | `npm test` | `server/` |
| Pura build (live jaisa) | `npm run build` | project root |
| Live mode chalana | `npm start` | project root (env variables set karke) |
| Code push | `git add .` → `git commit -m "..."` → `git push` | project root |
| MongoDB service | `Get-Service MongoDB` / `Start-Service MongoDB` | PowerShell |

Live jaisa local me test karna ho:
```powershell
cd "D:\My Projects\Claude Project\mini project"
npm run build
$env:NODE_ENV = "production"
$env:JWT_SECRET = "koi-lamba-random-secret-16-ya-zyada"
$env:MONGO_URI = "mongodb://127.0.0.1:27017/skillswap"
npm start
```
Phir **http://localhost:5000** kholo. Ek hi server poori site chalata hai.

---

## 11. Dikkat aaye to

| Error ya dikkat | Wajah aur hal |
|---|---|
| `MONGO_URI is not set` | Environment me `MONGO_URI` daala hi nahi, ya naam galat hai |
| `bad auth : Authentication failed` | Atlas ka username ya password galat. **Database Access** me username ka case dekho, naya password set karo, `MONGO_URI` me update karo |
| `querySrv ENOTFOUND` / cluster address nahi mila | Link galat copy hua. Atlas se dobara copy karo |
| `Server selection timed out` | Atlas **Network Access** me `0.0.0.0/0` nahi hai |
| `JWT_SECRET is too weak` | Live me chhota ya placeholder secret. 16+ random characters rakho |
| `/api/health` me `db: disconnected` | Database se connection toota hai. Upar ki 3 wajahen dekho, phir Render me **Manual Deploy → Restart** |
| Register kiya par Admin nahi dikha | `ADMIN_EMAILS` me email bilkul wahi hona chahiye. Theek karke restart karo, logout karke login karo. Ya `make-admin` command |
| Pehli visit pe 1 minute lagta hai | Render ka free plan idle hone pe so jata hai |
| Page khali / purana dikhe | Browser me **Ctrl + Shift + R** |
| `Port 5000 already in use` | Pehla backend abhi chal raha hai. Use band karo ya `PORT` badlo |
| Local me demo login nahi chal raha | Pehle `npm run seed` chalao |
| `git push` me `.env` dikh raha tha | Push mat karo. `.gitignore` me `.env` hona chahiye. Agar galti se chala gaya, Atlas password turant badlo |

---

## 12. Suraksha checklist (live se pehle)

- [ ] `MONGO_URI` aur `JWT_SECRET` sirf Render ke Environment me hain, code ya chat me nahi.
- [ ] Atlas ka password strong hai (16+ characters). Agar kabhi kahin share ho gaya hai to badal do.
- [ ] `git status` me `.env` nahi dikhta.
- [ ] `ADMIN_EMAILS` me sirf tumhare apne emails hain.
- [ ] Live pe `npm run seed` kabhi nahi chalana (wo vaise bhi production me ruk jata hai).

---

## 13. Live ke baad ki baatein

- **Backup:** Atlas ka free plan automatic backup nahi deta. Manual backup ke liye MongoDB Database Tools ka `mongodump` use karo.
- **Free plan so jata hai:** Idle hone pe Render service so jati hai. Paid plan me ye nahi hota. Free me koi uptime-ping service (jaise UptimeRobot) se `/api/health` har 5 minute pe check karwa sakte ho.
- **Apna domain:** Render → Settings → **Custom Domains**.
- **Abhi nahi hai:** email verification aur "forgot password" email (SMTP chahiye). Tab tak admin **Admin → Users → Reset password** se temporary password de sakta hai.
- **Google Meet:** link apne aap nahi banta. "Create Google Meet" button meet.google.com/new kholta hai, phir link paste hota hai.
