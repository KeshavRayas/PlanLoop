# Elevated Career OS Design System

## Overview

Elevated Career OS is a Neo-Brutalist executive recruiting platform designed to feel like a futuristic operating system for career discovery.

The experience should resemble a high-end command center rather than a traditional job board. Every surface is intentional, tactile, and highly structured.

Users should feel like they are operating a professional workstation built for executives, founders, architects, and senior engineers.

---

# Design Principles

## 1. Operating System First

The interface should feel like software running inside an operating system.

Examples:

* Command centers
* Terminal-inspired dashboards
* Bento operating systems
* Productivity workspaces
* Executive control panels

Avoid traditional recruitment-site layouts.

---

## 2. Neo-Brutalist Structure

Every component should have:

* Thick black borders
* Hard shadows
* Strong visual hierarchy
* High contrast
* Clear separation between surfaces

No soft shadows.

No glassmorphism.

No gradients.

No blurry effects.

---

## 3. Playful Professionalism

The product serves professionals, but it should not feel corporate.

Use:

* Bright accents
* Large rounded shapes
* Pill badges
* Icon circles
* Bold typography

while maintaining credibility.

---

## 4. Information Density

The platform contains large amounts of information.

Design should support:

* Rapid scanning
* Fast comparison
* Visual grouping
* Executive-level decision making

---

# Color System

## Base

```yaml
background: "#EAEAEA"
surface: "#FFFFFF"
surface-secondary: "#F7F7F7"
text: "#000000"
text-secondary: "#666666"
border: "#000000"
```

---

## Accent Colors

### Yellow

```yaml
yellow: "#FFE01B"
```

Used for:

* Active panels
* Highlight modules
* Navigation emphasis
* Premium visual areas

---

### Green

```yaml
green: "#00D39B"
```

Used for:

* Primary CTA buttons
* Apply actions
* Success states
* Positive metrics

---

### Purple

```yaml
purple: "#B85BFF"
```

Used for:

* Status badges
* Executive labels
* Metadata indicators

---

### Red

```yaml
red: "#FF5A5A"
```

Used for:

* Errors
* Destructive actions

---

# Typography

## Font Family

```css
font-family: "Inter", sans-serif;
```

Use only Inter.

---

## Display

```yaml
fontSize: 56px
fontWeight: 900
lineHeight: 1.0
```

Used for:

* Hero titles
* Major page headings

---

## Headline

```yaml
fontSize: 36px
fontWeight: 800
lineHeight: 1.1
```

Used for:

* Job titles
* Sidebar titles

---

## Section Title

```yaml
fontSize: 20px
fontWeight: 800
```

Used for:

* Module headings
* Card headers

---

## Body

```yaml
fontSize: 16px
fontWeight: 500
lineHeight: 1.5
```

Used for:

* Descriptions
* Content blocks

---

## Labels

```yaml
fontSize: 12px
fontWeight: 800
letterSpacing: 0.08em
textTransform: uppercase
```

Used for:

* Metadata
* Categories
* Status indicators

---

# Border System

All surfaces use strong borders.

```css
border: 3px solid #000;
```

Important panels may use:

```css
border: 4px solid #000;
```

Never use subtle borders.

---

# Shadow System

The design system uses hard offset shadows.

## Small

```css
box-shadow: 4px 4px 0 #000;
```

## Medium

```css
box-shadow: 6px 6px 0 #000;
```

## Large

```css
box-shadow: 8px 8px 0 #000;
```

No blur.

No opacity.

No elevation gradients.

---

# Radius System

```yaml
sm: 12px
md: 16px
lg: 24px
xl: 32px
full: 9999px
```

---

# Layout

## Desktop

Use a three-column operating system layout.

```css
grid-template-columns:
280px
1fr
420px;
```

Structure:

[ Filter Panel ] [ Job List ] [ Detail Panel ]

---

## Mobile

Collapse into:

Filter Drawer
↓
Job List
↓
Detail Sheet

Single column only.

---

# Header

Large command-center style banner.

Properties:

```css
height: 180px;
background: white;
border: 4px solid black;
border-radius: 32px;
box-shadow: 8px 8px 0 black;
```

Contains:

* Brand mark
* System title
* Description
* Applications button

---

# Filter Panel

The filter sidebar acts as a control module.

Properties:

```css
background: white;
border: 3px solid black;
border-radius: 24px;
padding: 24px;
```

Sections:

* Search
* Department
* Employment Type
* Location
* Experience Level

Use large custom radio buttons.

---

# Job Cards

Job cards are modular operating-system components.

Properties:

```css
background: white;
border: 3px solid black;
border-radius: 24px;
padding: 24px;
box-shadow: 6px 6px 0 black;
```

Hover:

```css
transform: translate(-2px,-2px);
```

Maintain shadow alignment.

---

## Card Structure

[ Icon ]

Company Name

Job Title

Location • Employment Type

Salary

[ Tags ]

[ Arrow Action ]

---

# Detail Sidebar

Acts as a system module.

Properties:

```css
width: 420px;
background: white;
border: 4px solid black;
border-radius: 32px;
box-shadow: 8px 8px 0 black;
```

---

## Sidebar Header

```css
background: #FFE01B;
height: 88px;
border-bottom: 3px solid black;
```

Contains:

* Module icon
* Module title
* Close button

---

## Sticky Footer

Always visible.

```css
position: sticky;
bottom: 0;
background: white;
border-top: 3px solid black;
```

Contains:

* Salary summary
* Apply button

---

# Buttons

## Primary Button

```css
background: #00D39B;
color: black;

border: 3px solid black;
border-radius: 999px;

font-weight: 800;

box-shadow: 4px 4px 0 black;
```

Hover:

```css
transform: translate(-2px,-2px);
```

---

## Secondary Button

```css
background: white;
color: black;

border: 3px solid black;
border-radius: 999px;
```

---

# Badges

## Executive Badge

```css
background: #B85BFF;
color: white;

padding: 6px 12px;
border-radius: 999px;
font-size: 11px;
font-weight: 800;
text-transform: uppercase;
```

---

## Premium Badge

```css
background: black;
color: #FFE01B;
```

---

# Tags

Job tags should appear as soft pills.

```css
background: #F3F3F3;
padding: 6px 12px;
border-radius: 999px;
font-size: 12px;
font-weight: 700;
```

No borders.

---

# Icons

Use:

* Lucide Icons
* Rounded icon containers
* 56px icon circles

Container:

```css
width: 56px;
height: 56px;

border: 3px solid black;
border-radius: 50%;
```

---

# Motion

Keep animations minimal.

Allowed:

```css
transition: 150ms ease;
```

Interactions:

* Button press
* Card hover
* Sidebar open
* Tag hover

Avoid:

* Floating effects
* Elastic animations
* Excessive motion

---

# Avoid

Do NOT use:

* Glassmorphism
* Material Design
* Apple-style blur
* Tailwind default cards
* Corporate blue gradients
* Soft shadows
* Tiny border radii
* Minimal luxury beige themes
* Linear-style monochrome interfaces

---

# Desired Feeling

The interface should feel like:

* Executive Operating System
* Neo-Brutalist Career Dashboard
* Future Workstation
* Premium Command Center
* Tactical Career Intelligence Platform

Users should feel they are managing opportunities through a powerful professional operating system rather than browsing a conventional job board.
