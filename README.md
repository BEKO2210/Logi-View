# Logi-View

Free, open-source workspace to map logistics process steps and bookings, estimate lead time, and highlight capacity bottlenecks.

## Current capabilities

- Edit process names, steps, areas, processing minutes, utilization, and queue sizes.
- Add, edit, and remove required, optional, and automatic bookings.
- Reorder steps by dragging them; inspect capacity and booking handoffs per step.
- Find repeated booking codes and flag steps at 85% utilization or 15 waiting orders.
- Compare the current process with a transparent potential estimate (five minutes per optional booking; not measured data).
- Import/export a portable JSON process file.
- Automatically save a draft in the current browser. Drafts are not uploaded or synchronized.

## Run locally

```bash
pnpm install
pnpm dev
```

## Technology

Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, React Flow 12 and Vinext.

Licensed under Apache-2.0.
