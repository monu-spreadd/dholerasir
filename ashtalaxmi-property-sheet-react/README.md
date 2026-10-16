# Ashtalaxmi Property Sheet (React)

A form that creates the Ashtalaxmi "Property Information" PDF in the browser.
Built with React 18 + Vite. No server or database: the PDF is made on the user's device with jsPDF.

## Run it

```bash
npm install
npm run dev       # local preview at http://localhost:5173
npm run build     # production files in /dist
npm run preview   # check the built site
```

Needs Node.js 18 or newer.

## Deploy

- **Netlify (connected to Git):** `netlify.toml` is included. Build command `npm run build`, publish folder `dist`.
- **Netlify drop / any web host:** run `npm run build` and upload the contents of `dist/`.
  The build uses relative paths, so it also works from a sub-folder.

## Where things live

| File | What it holds |
|---|---|
| `src/config.js` | **Edit here:** villages, T.P. numbers, zones, T.P. types, NA status, road widths, features, contact details, WhatsApp link, character limits |
| `src/App.jsx` | The form, SUBMIT flow, Reset, result screen |
| `src/components/fields.jsx` | Field wrapper, text box with counter, number-only box, dropdown, chips |
| `src/components/PlotImageInput.jsx` | Optional plot image upload (one JPG/PNG/WEBP, scaled to max 2000 px) |
| `src/components/ResultView.jsx` | "PDF created" screen |
| `src/lib/form.js` | Form state, validation, number helpers, file name |
| `src/pdf/sheet.js` | Draws the sheet on a canvas and builds the PDF (layout, icons, links) |
| `src/assets/` | Logo, header image, Dholera SIR photos, WhatsApp QR code |
| `src/styles.css` | Form styles (navy + gold theme) |

## Notes

- All fields are optional. "Other" needs its text box filled; number and link boxes must hold a number / link.
- File names use English letters only (browsers drop names with Gujarati letters); the Gujarati name still prints on the sheet.
- Links in the PDF: logo, header image, photos, WhatsApp button and QR open the WhatsApp chat; the plot card and "Open in Google Maps" open the map link; footer phone, website and email are clickable.
- Fonts (Cinzel, Montserrat, Noto Sans Gujarati) are bundled from `@fontsource`, so the PDF looks the same on every device.
