---
Source: assets/tools-images/45-system-license-general-public-license.jpg
Screen: Libraries (OSS Licenses)
Related-Spec: 21-app/40-tools.md
---

# 45 — Libraries (OSS Licenses)

## 1. One-line purpose

A scrolling text modal displaying Open Source Software (OSS) licenses, specifically the GNU General Public License (GPL).

## 2. Full-frame layout

- **Background:** The `System Information` modal, which itself sits over the main dashboard.
- **Modal:** A new `Libraries` dialogue box overlaid on top of the System Information modal.
- **Content:** A large, scrollable text area containing legal boilerplate.
- **Footer:** Pagination controls (`1 / 16`) and a `Close` button.

## 3. Color palette and role

- **Modal Chrome:** Dark gray/charcoal background with white text, distinguishing it from the standard light gray modals.

## 4. Text transcription (grouped by region)

**Modal Header**
`Libraries`

**Modal Body**
`GNU GENERAL PUBLIC LICENSE`
`Version 2, June 1991`

`Copyright (C) 1989, 1991 Free Software Foundation, Inc.`
`51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA`
`Everyone is permitted to copy and distribute verbatim copies`
`of this license document, but changing it is not allowed.`

`Preamble`
`The licenses for most software are designed to take away your freedom to share and change it. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change free software--to make sure the software is free for all its users. This General Public License applies to most of the Free Software Foundation's software...` _(Standard GPL text)_

**Footer Buttons**
`1 / 16` `[ < ] [ > ]`
`Close` (For the Libraries modal)
`Close` (Visible underneath, for the System Info modal)

## 5. Interactive controls

- **Pagination:** Flips through the 16 pages of legal text.

## 6. User expectation and workflow context

A compliance requirement. Embedded Linux systems (which this likely is, under the hood) must display the GPL and other licenses for libraries they consume.

## 7. Adjacent screens

- `44-system-information-controller-serial-details.jpg`: The parent modal.

## 8. Data shown

- Standard GNU GPL v2 legal text.

## 9. Failure and edge states hinted

- None.

## 10. AI-consumption notes

- **Mapping to our app:** Standard legal boilerplate requirement. Can be implemented as a simple static text route or modal.
