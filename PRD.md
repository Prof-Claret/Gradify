# Product Requirement Document (PRD)

## 1. Product Overview

* **Product Name:** Gradify
* **Tagline:** *Simplify Your Academic Journey*
* **Product Vision:** Become the ultimate all-in-one control center for university students, helping them manage their academic schedule, track assignments, monitor GPA targets, organize finances, solve complex domain-specific problems, write tech notes, and graduate on time with optimal results.
* **Target Audience:** Undergraduate and postgraduate college students, with specialized preset support for UNIKA Santo Thomas (UNIKA UST) Medan and customizable modules for STEM/Computer Science majors.

---

## 2. Core Value Proposition & Goals

1. **Centralization:** Consolidate class schedules, assignment deadlines, code/lecture notes, attendance, and campus events into a single platform.
2. **Semester-based Academic Tracking:** Organize courses, grades, credits (SKS), and notes strictly by semester (Semester 1 through Semester 8+) with historical archive support.
3. **Preset & Flexible Onboarding:** Default preset data for **Universitas Katolik Santo Thomas (UNIKA UST)** with full dropdown integration for its 8 faculties and study programs, alongside a "Tambah Kampus Baru" fallback for other universities.
4. **Academic & Career Growth:** Empower students with clear visibility into their semester GPAs (IPS), cumulative GPA (IPK), graduation milestones, and portfolio generation.
5. **CS & Domain-Specific Problem Solving:** Provide interactive math solvers, step-by-step calculators, regex testers, SQL visualizers, and code-friendly note-taking tools tailored for Computer Science majors.
6. **Scientific Calculator & Greek Symbol Palette:** Built-in scientific calculator toolbar supporting mathematical powers/exponents ($x^y, e^x$), roots, and a full Greek symbol reference palette ($\alpha, \beta, \gamma, \delta/\Delta, \lambda/\Lambda, \mu, \pi/\Pi, \sigma/\Sigma, \omega/\Omega$).

---

## 3. Feature Roadmap & Functional Specifications

### Phase 0: User Accounts, Registration Wizard & Academic Profile (Foundation)

#### 0.1 Registration Wizard & Student Onboarding Flow
* **Overview:** Step-by-step account setup wizard capturing student identity, university metadata, and active semester.
* **Key Components:**
  * **Sign Up / Authentication:** Email/Password registration, Google OAuth, and Apple ID single sign-on.
  * **Campus Selection Mode (Radio Selection):**
    * **Mode 1: "Pilih Kampus (Default UNIKA UST)"**
      * Auto-selects **Universitas Katolik Santo Thomas (UNIKA UST Medan)**.
      * Dynamically populates the **Fakultas** dropdown:
        1. *Fakultas Ilmu Komputer (FIKOM)*
        2. *Fakultas Ekonomi dan Bisnis (FEB)*
        3. *Fakultas Teknik (FT)*
        4. *Fakultas Pertanian (FP)*
        5. *Fakultas Hukum (FH)*
        6. *Fakultas Filsafat (FF)*
        7. *Fakultas Ilmu Budaya / Sastra (FIB)*
        8. *Fakultas Keguruan dan Ilmu Pendidikan (FKIP)*
      * Dynamically populates the **Prodi** dropdown based on selected faculty (e.g., *Teknik Informatika (S1)*, *Sistem Informasi (S1)*, *Sains Data (S1)* for FIKOM).
    * **Mode 2: "Tambah Kampus Baru (Manual Input)"**
      * Displays text fields for the user to manually type: **Nama Kampus Custom**, **Nama Fakultas Custom**, and **Nama Prodi Custom**.
  * **Student Registration Metadata:**
    * Full Name & Profile Avatar.
    * **Student Registration Number (NPM / NIM)**.
    * **Active Semester Selection (Semester 1 - 8+):** Determines active dashboard content.
    * Target GPA / Expected Graduation Year.

#### 0.2 User Account & Identity Hub
* **Overview:** Settings dashboard to edit student metadata, switch current active semester, toggle campus preset settings, and manage security settings.

---

### Phase 1: MVP, Semester Management & Core Course Hub

#### 1.1 Semester Management Engine (*Fitur Kelola Semester*)
* **Overview:** Dedicated module allowing users to manage their academic lifecycle semester by semester.
* **Key Capabilities:**
  * **Semester Switcher:** Quick-select active semester dropdown on top header (e.g., "Semester 3 - Ganjil 2026/2027").
  * **Semester Archive / Transkrip Akademik:** View past semester course records, earned SKS, and Semester GPA (IPS).
  * **Semester Transition Wizard:** End-of-semester prompt to promote the student to the next semester, archiving past courses and resetting active schedule views.
  * **Max SKS Allowance Calculator:** Dynamically calculates maximum SKS allowed for the next semester based on current IPS (e.g., IPS $\ge 3.00 \implies$ Max 24 SKS).

#### 1.2 Course Management Module (Input & Management Matkul)
* **Overview:** Centralized catalog of all courses taken in current and past semesters.
* **Attributes:** Semester Number (1-8+), Course Code, Name, Credits (SKS), Day/Time, Room, Lecturer Contact Info, and Grading Weight Scale.

#### 1.3 Academic Dashboard & Task Tracker
* **Overview:** Daily agenda view filtered by active semester, priority-tagged task list, upcoming exam countdowns, and quick-add actions.

#### 1.4 CS Code & Lecture Notes Engine (*Catatan Perkuliahan CS*)
* **Overview:** Rich-text and Markdown note-taking workspace designed specifically for technical students, grouped by Course and Semester.
* **Key Features:**
  * Syntax highlighting for common programming languages (Python, C++, Java, SQL, HTML/CSS, JavaScript).
  * Direct course-tagging and snippet copy functionality.
  * Embedded formulas using LaTeX notation ($...).

---

### Phase 2: Computer Science & IT Specialized Toolkit

#### 2.1 Calculator Engine & Greek Symbol / Exponent Palette
* **Overview:** Integrated scientific calculation suite embedded across CS Math Hub, Discrete Math, and General Calculators.
* **Scientific & Power Calculation Operators:**
  * **Exponentiation / Perpangkatan:** $x^y$, $x^2$, $x^3$, $e^x$, $10^x$.
  * **Roots & Logarithms:** $\sqrt{x}$, $\sqrt[n]{x}$, $\ln(x)$, $\log_{10}(x)$.
* **Greek Symbol Input & Reference Palette:**
  * **Alfa ($\alpha$ / $\text{A}$):** Angle, coefficients, angular acceleration.
  * **Beta ($\beta$ / $\text{B}$):** Angles, ratio velocity, regression coefficients.
  * **Gamma ($\gamma$ / $\Gamma$):** Gamma rays, Gamma functions in advanced math.
  * **Delta ($\delta$ / $\Delta$):** Representing change/difference ($\Delta x$).
  * **Lambda ($\lambda$ / $\Lambda$):** Wavelengths, eigenvalue notations in Linear Algebra, Lambda calculus.
  * **Mu ($\mu$ / $\text{M}$):** Micro prefix ($10^{-6}$), population mean, friction coefficient.
  * **Pi ($\pi$ / $\Pi$):** Mathematical constant ($\approx 3.14159$) and product operator ($\Pi$).
  * **Sigma ($\sigma$ / $\Sigma$):** Lowercase ($\sigma$) for standard deviation; uppercase ($\Sigma$) for summation operator.
  * **Omega ($\omega$ / $\Omega$):** Lowercase ($\omega$) for angular velocity; uppercase ($\Omega$) for Resistance (Ohm) and Big-Omega asymptotic notation.

#### 2.2 CS & IT Math Toolkit (Core Scientific Domains)
1. **Sistem Bilangan (Number Systems):** Base conversions (Binary, Octal, Decimal, Hexadecimal) with step-by-step remainder method breakdowns.
2. **Aljabar Linier & Matriks:** Matrix operations ($2\times2, 3\times3, 4\times4$), Determinants, Adjugate, and Gaussian Elimination (OBE) step-by-step solvers.
3. **Kalkulus & Optimasi:** Symbolic polynomial derivatives and Gradient Descent visualizations.
4. **Statistika & Data Science:** Descriptive statistics calculator ($\mu, \sigma, \sigma^2$, Mean, Median, Mode) with step-by-step variance tables.

#### 2.3 Discrete Mathematics Hub (Matematika Diskrit)
1. **Mathematical Logic:** Interactive truth tables ($p \land q$, $p \lor q$, $p \rightarrow q$, $p \leftrightarrow q$, $p \oplus q$).
2. **Set Theory:** Union ($A \cup B$), Intersection ($A \cap B$), Set Difference ($A \setminus B$), and Venn diagram helpers.
3. **Relations & Functions:** Domain/Codomain mappings and Injectivity/Surjectivity/Bijectivity classifiers.
4. **Boolean Algebra:** Logic gate minimization and De Morgan's Law expanders.
5. **Combinatorics & Probability:** Permutations $P(n,r)$ and Combinations $C(n,r)$ factorial solver.
6. **Graph Theory:** BFS/DFS traversal visualizations and graph property calculators.
7. **Number Theory:** Euclidean Algorithm solver for $\gcd(a,b)$ and Modular Arithmetic calculations.
8. **Mathematical Induction & Recurrences:** Step-by-step proofs for base cases $P(1)$ and inductive steps $P(k) \implies P(k+1)$.

#### 2.4 CS Specialized Developer Tools (*Fitur Pendukung CS*)
* **SQL Query Builder & Visualizer:** Relational JOINs, SELECT aggregations, and DDL schema scripts.
* **Regex Engine Tester:** Real-time pattern validation with Automata theory references.
* **Subnet & CIDR Calculator:** IPv4 network addressing, subnet masks, and host counts.
* **Big-O & Data Structure Quick Reference:** Interactive time/space complexity lookup tables.

---

### Phase 3 & 4: GPA Projection, Life & Career Extensions
* **GPA Calculator & Cum Laude Target Simulator (Filtered by Semester & Cumulative)**
* **Final Project / Skripsi Milestone Tracker**
* **Student Budget & Kos Expense Tracker**
* **Student Portfolio & CV Auto-Builder**

---

## 4. App Information & Developer Attribution (About App & About Dev)

### 4.1 About App (Tentang Aplikasi)
* **Application Title:** Gradify
* **Current Version:** v1.0.0 (Beta Release)
* **Description:** Gradify adalah *Academic & Computer Science Super-App* yang dirancang khusus untuk membantu mahasiswa mengelola seluruh aspek perkuliahan secara terstruktur, intuitif, dan efisien. Aplikasi ini mengintegrasikan manajemen semester, jadwal kuliah, pelacak tugas, kalkulator IPK/IPS, manajemen skripsi, pencatatan kode, hingga toolkit penyelesai soal Matematika Diskrit dan Informatika.
* **Core Technologies:** HTML5, Modern JavaScript (ES6+), Tailwind CSS, MathJax (LaTeX Renderer), Node.js, and Relational Database Architecture.
* **Licensing & Copyright:** © 2026 Gradify. All rights reserved. Built for Academic & Educational Excellence.

### 4.2 About Developer (Tentang Pengembang)
* **Lead Developer / Creator:** XII DEV / SCARLET DEV
* **GitHub:** [@Prof-Claret](https://github.com/Prof-Claret)
* **Ownership Status:** Proyek Mandiri / Personal Project (Bukan proyek atas nama kampus)
* **Developer Vision:** Berkomitmen untuk menciptakan solusi perangkat lunak berstandar tinggi yang mampu menyelesaikan permasalahan nyata di dunia akademik dan mendukung rekan-rekan mahasiswa meraih predikat kelulusan terbaik (*Cum Laude*).
* **Contact & Feedback Support:** 
  * Email Support: `claretianovfx@gmail.com`