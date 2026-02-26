# Review Guidelines — Product System

In addition to standard code review rules, verify these criteria in every review:

## User-Facing Communication
- No technical error messages exposed to the user (no stack traces, no "Error 500", no variable names)
- All user-facing error messages in clear, simple language
- Forms validate in real-time, not only after submit
- Loading states on every async operation > 500ms (spinner, skeleton, or message)
- Mandatory confirmation before deleting any data

## Performance
- No screen with loading time > 3 seconds on normal connection
- Optimized images (WebP when possible, lazy loading)
- No unnecessary API calls on initial render

## Mobile / Responsive
- Layout works on 375px width screens (iPhone SE)
- All buttons and links with minimum touch area of 44px
- No horizontal overflow on any screen
- Readable text without zoom (minimum 16px on form fields)

## Data and Security
- No user data exposed in public URLs
- No data lost due to user error (confirmation before destructive actions)
- Local state synchronized with server (no inconsistent states)

## Basic Accessibility
- Images with descriptive alt text
- Adequate minimum contrast (WCAG AA)
- Keyboard navigation works on main flows

## Severity Rubric
- [P0] Breaks the product for the user, blocks release
- [P1] Urgent, must fix before publishing
- [P2] Normal, fix in next iteration
- [P3] Suggestion, nice to have
