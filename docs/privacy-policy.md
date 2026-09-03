# StudySphere Privacy Policy

**Status: draft.** Not yet published, and not yet in force.
**Last updated:** 3 September 2026

---

## The short version

StudySphere is a study app. To run it we hold your account details, the things
you create in it — study sessions, to-dos, calendar events, messages — and who
you are connected to.

We do not track you. There are no analytics, no advertising, no tracking
pixels, and no third-party scripts on any page. We have never sold your data
and will not. The fonts are served from our own servers, so simply opening the
app sends nothing to Google.

You can download everything we hold about you, or delete your account outright,
from **Settings**. Neither requires you to ask us.

The rest of this document is the detail behind those statements.

---

## 1. Who is responsible for your data

The data controller is **[YOUR FULL LEGAL NAME]**, an individual, operating
StudySphere at https://studysphere-ten-gold.vercel.app.

Contact for anything in this policy, including any request about your data:
**[CONTACT EMAIL]**

We are not required to have a Data Protection Officer and do not have one.
Requests go to the address above and are answered by the controller.

---

## 2. What we collect

### What you give us when you sign up

- **Your name** and **email address** — required. The email identifies your
  account and is where password resets go.
- **Your password** — stored only as a salted hash. We never hold it in a form
  anyone can read, including us.
- **Your date of birth** — required, to confirm you meet the minimum age
  (section 10). Your date of birth is never shown to anyone. Other users may
  see your *age in years* if your profile is public or they are your friend;
  they never see the date itself.

### What you may add, but do not have to

A profile photo, a short bio, your school, your field of study, your year or
grade, your expected graduation date, and your interests. All of these are
optional, all can be changed or emptied at any time in Settings, and the app
works without any of them.

### What you create by using the app

- **Study sessions** — when a timer ran and for how long.
- **To-dos, calendar events and reminders** — including anything you type into
  them.
- **Study groups** you create or join, and your membership of them.
- **Chat messages and any files you attach** to them.
- **Friend connections** and friend requests, including pending ones.
- **Meetings** you schedule or are invited to.
- **Notifications** the app has generated for you.

### What the app records on its own

- **Study statistics** — number of sessions, total focus minutes, current
  streak, tasks completed. These are calculated from your own sessions and
  to-dos, and appear on the leaderboard.
- **Presence** — whether you are currently online, and when you were last seen.
- **Server logs** held by our hosting providers, which include IP addresses and
  request times. These are a normal part of running any website and are used
  for security and diagnosing faults.

---

## 3. What we do not do

We want to be specific rather than reassuring, because these are the things
most services in this category do and we do not:

- No advertising, and no advertising identifiers.
- No analytics or product-usage tracking of any kind. There is no Google
  Analytics, no Meta pixel, no session recording, no heatmaps.
- No third-party scripts on any page of the app.
- No selling, renting or sharing your data with data brokers or advertisers.
- No profiling and no automated decision-making that produces legal or
  similarly significant effects on you.
- No tracking cookies. See section 12 for what is actually stored on your
  device, all of which is functional.

---

## 4. Why we use your data, and our lawful basis

Under UK and EU GDPR every use of your data needs a lawful basis. Ours are:

| What we use it for | Lawful basis |
|---|---|
| Creating and running your account; showing you your timer, to-dos, calendar, groups and messages; delivering messages to the people you send them to | **Contract** — Art 6(1)(b). We cannot provide the service you asked for without this. |
| The optional profile fields, your photo, and making your profile publicly visible | **Consent** — Art 6(1)(a). You choose to add these and can withdraw at any time by removing them or making your profile private. |
| Browser notifications | **Consent** — Art 6(1)(a), given through your browser's own permission prompt and withdrawable in your browser settings. |
| Keeping the service secure: preventing abuse, rate-limiting, stopping people reading data that isn't theirs, diagnosing faults | **Legitimate interests** — Art 6(1)(f). Our interest is in a service that works and is not abused; this is a minimal use of data and one you would reasonably expect. |
| Responding to a lawful request from a court or regulator | **Legal obligation** — Art 6(1)(c). |

Withdrawing consent does not affect anything done before you withdrew it, and
never affects the parts of the app that run on the contract basis.

---

## 5. Who can see what

This is the part most worth reading, because StudySphere is social by design
and some of what you enter is meant to be seen.

**Always visible to other signed-in users:** your name and your profile photo.
This is deliberate — people need to be able to find and recognise you to send a
friend request. Making your profile private does not hide these.

**Visible only if your profile is public, to your accepted friends, or to
you:** your bio, school, field of study, year or grade, interests, and your age
in years.

**Never visible to other users, ever:** your email address, your date of birth,
and your expected graduation date. These are excluded at the database level,
not merely hidden in the interface.

**Visible to everyone in a group:** every message and file you post in that
group's chat, and the fact that you are a member of it.

**Visible on the leaderboard:** your name, photo and study statistics.

**Groups you created:** if you delete your account, groups you created continue
to exist for the people still in them, without you. We do not delete other
people's messages and shared work because one member left. See section 9.

---

## 6. Who else processes your data

We use three providers. Each is a processor acting on our instructions under a
written agreement, and none of them may use your data for their own purposes.

| Provider | What they do | Where |
|---|---|---|
| **Supabase** | Authentication, the database holding everything in section 2, file storage for photos and chat attachments, and the server functions that handle account deletion and video call setup. This is the store of record. | [CONFIRM PROJECT REGION] |
| **Vercel** | Hosts and delivers the app itself. Sees the requests your browser makes, including IP address. | Global edge network |
| **Daily** | Video calls only. Receives the call room details and your audio and video for the duration of a call. Nothing else about your account is sent. | Global |

Video calling is currently **switched off**. While it is off, no data reaches
Daily at all. This policy will be updated with the date it is switched on.

Beyond these three, we disclose your data only where we are legally required to
by a court or a regulator with authority to compel it.

---

## 7. Where your data goes

Our providers are based in the United States and may process data there and in
other countries outside the UK and EEA.

Those transfers are covered by the European Commission's Standard Contractual
Clauses, together with the UK International Data Transfer Addendum, which are
built into our agreements with each provider. You may request a copy of the
relevant safeguards from the contact address in section 1.

---

## 8. How long we keep it

- **While your account exists**, we keep the data in section 2, because the app
  cannot show you your own history without it.
- **When you delete your account**, everything keyed to you is removed from our
  live database immediately, with the two exceptions in section 9.
- **Backups** are held by Supabase on a rolling basis and are overwritten
  within **30 days**. Deleted data can persist in a backup until then, and is
  not restored to the live service.
- **Security and abuse-prevention records**, such as rate-limiting counts, are
  kept for **30 days**.
- **Server logs** are kept by our hosting providers on their standard retention
  schedules, which do not exceed **30 days**.
- **Accounts inactive for 24 months** will be deleted after we email a warning
  to the address on the account and give you 30 days to sign in.

---

## 9. What survives deleting your account, and why

Two things do not disappear when you delete your account:

1. **Study groups you created** continue to exist, without an owner, for the
   members still in them.
2. **Meetings you scheduled** continue to exist for the people invited to them.

The reason is that these are shared. Deleting them would delete a whole group,
its entire chat history and everyone else's messages, because one person left.
Your name, photo, profile and your own messages are removed; what remains is
the shared space itself, no longer attributed to you.

If you want your own messages inside a group removed as well, delete them
before you close your account, or ask us at the address in section 1.

---

## 10. Age

**You must be 16 or over to use StudySphere.** We ask for your date of birth at
signup for this reason, and for no other.

We do not knowingly hold data about anyone under 16. If we learn that an
account belongs to someone under 16 we will delete it and its data without
waiting to be asked. If you believe a child under 16 has an account, tell us at
the address in section 1 and we will act on it.

---

## 11. How your data is protected

- Every connection to the app uses TLS. Data is encrypted at rest by our
  hosting provider.
- Access to your rows in the database is enforced by the database itself,
  through row-level security, rather than by the app asking politely. A request
  for data that is not yours does not return it, regardless of what the request
  says.
- Passwords are stored only as salted hashes, and must be at least 8 characters
  with upper case, lower case, a digit and a symbol.
- Files you upload are served through short-lived signed links rather than
  public URLs.

No service can promise it will never be breached. If one happens and it is
likely to put your rights or freedoms at risk, we will report it to the
relevant supervisory authority within **72 hours** of becoming aware, and tell
you directly without undue delay.

---

## 12. What is stored on your device

**StudySphere sets no cookies, and shows no cookie banner, because it does not
need one.** Everything it stores on your device is strictly necessary to make
the app work, which is the one category that does not require consent under the
UK PECR and the EU ePrivacy Directive.

What is stored, all in your browser's local storage:

| What | Why |
|---|---|
| Your session token | Keeps you signed in. Without it you would log in on every page. |
| Timer state | Lets a running timer survive a refresh or a closed tab. |
| Your chosen theme | Remembers how you like the app to look. |
| Arcade game high scores | Kept only on your device, and never sent to us. |
| A profile photo picked at signup | Held briefly until your account is confirmed and the photo can be uploaded, then discarded. |

Clearing your browser storage removes all of it. You will be signed out, and
your game high scores will be lost. Nothing else is affected.

---

## 13. Your rights

Under UK and EU GDPR you have the right to:

- **Get a copy of your data** (Art 15) and **take it elsewhere** in a portable
  format (Art 20). Settings → **Download my data** does this immediately, with
  no request and no waiting.
- **Delete your account and your data** (Art 17). Settings → **Delete my
  account** does this immediately. It cannot be undone.
- **Correct anything wrong** (Art 16). Most fields are editable in Settings;
  write to us for anything that is not.
- **Restrict or object to** how we use your data (Art 18 and 21), including
  objecting to anything we do on the legitimate-interests basis in section 4.
- **Withdraw consent** (Art 7(3)) for anything given on that basis, at any time.
- **Complain to a regulator** (Art 77) — see section 15.

We will not charge you for exercising any of these, and using them will never
make the service worse for you. Where you write to us rather than using
Settings, we will respond within **one month**.

---

## 14. Changes to this policy

If we change this policy we will update the date at the top. If a change
materially affects how we use your data — a new provider, a new purpose, a new
basis — we will tell you in the app or by email before it takes effect, and
never apply it retrospectively.

---

## 15. Complaining

Please raise it with us first, at the address in section 1. If you are not
satisfied, you have the right to complain to a supervisory authority:

- **United Kingdom** — Information Commissioner's Office, ico.org.uk, helpline
  0303 123 1113.
- **European Union** — the data protection authority of the country you live or
  work in. A full list is published by the European Data Protection Board at
  edpb.europa.eu.

Complaining to a regulator does not affect any other legal remedy available to
you.
