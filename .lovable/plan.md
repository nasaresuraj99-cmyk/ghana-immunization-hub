

# Wire Up Child Travel-Out/Travel-In Functionality

## Problem
The transfer/travel-out logic and UI components already exist in the codebase but are **not connected**. Specifically:
- `useChildren` exports `transferChildOut` and `transferChildIn` functions (working, with Firebase sync)
- `ChildTransferModal` component exists with full form (destination, reason, date, notes)
- `ChildProfileModal` accepts `onTransferOut` and `onTransferIn` props but they are never passed
- **None of these are wired together in `Index.tsx`**

## Plan

### 1. Wire transfer functions in Index.tsx
- Destructure `transferChildOut` and `transferChildIn` from `useChildren`
- Add state for the `ChildTransferModal`: `transferModalChild` and `transferMode` ('in' | 'out')
- Import and render `ChildTransferModal`
- Pass `onTransferOut` and `onTransferIn` handlers to `ChildProfileModal` that open the transfer modal

### 2. Add "Mark Traveled Out" action to ChildRegisterSection
- Add an `onTransferOut` prop to `ChildRegisterSection`
- Add a travel-out action button (Plane icon) in the child row actions, so staff can mark a child as traveled out directly from the register without opening the profile first
- Only show for active children (not already traveled/moved out)

### 3. Add "Mark Returned" action for traveled-out children
- Add an `onTransferIn` prop to `ChildRegisterSection`
- For children already marked as traveled/moved out, show a "Mark as Returned" button instead of the travel-out button

### Files to modify
- **`src/pages/Index.tsx`**: Import `ChildTransferModal`, destructure transfer functions, add state, render modal, pass props to `ChildProfileModal` and `ChildRegisterSection`
- **`src/components/sections/ChildRegisterSection.tsx`**: Add `onTransferOut`/`onTransferIn` props and action buttons in the child row

