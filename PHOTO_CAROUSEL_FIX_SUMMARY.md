# Photo Carousel Fix Summary

**Date**: October 31, 2025  
**Issue**: Photo carousel not showing images on job cards after checkpoint restore  
**Status**: ✅ FIXED

---

## What Was the Problem?

When you ran `reset_to_checkpoint` to restore a checkpoint with the expectation of seeing job images, the photos were missing from the job cards in manager view. This affected:

- ✅ Invoiced/Approved jobs: Images appeared (had details)
- ❌ Pending/Assigned jobs: Images disappeared (no details)

## Root Cause Analysis

The checkpoint system saves work images and receipts for ALL jobs, but the restore logic had a conditional check that **only restored images for jobs with status `work_complete` or `approved`**:

```python
# OLD CODE (BUGGY)
if status in ['work_complete', 'approved'] and 'details' in job_data and job_data['details']:
    # Restore work_images here
    if 'work_images' in job_data:
        for img_data in job_data['work_images']:
            WorkImage.objects.create(...)  # ← Only happens for completed/approved
```

**Why this broke:**
- Pending/assigned jobs have `status='pending_assignment'` or `status='assigned'`
- These jobs DON'T have `details` (worker hasn't completed work yet)
- The condition `status in ['work_complete', 'approved']` failed for these jobs
- Images were skipped silently with no error message
- Manager saw empty photo carousels on otherwise valid jobs

## The Fix

Moved image and receipt restoration **outside the conditional block** so it runs for ALL jobs:

```python
# NEW CODE (FIXED)
# ... job status assignment logic ...

# Restore work images for ALL jobs (not just completed/approved)
# This ensures before photos display even for pending/assigned jobs
if 'work_images' in job_data:
    for img_data in job_data['work_images']:
        src_path = os.path.join(settings.MEDIA_ROOT, img_data['image_path'])
        if os.path.exists(src_path):
            with open(src_path, 'rb') as f:
                WorkImage.objects.create(
                    job=job,
                    image_path=File(f, name=os.path.basename(img_data['image_path'])),
                    description=img_data.get('description', ''),
                    image_type=img_data.get('image_type', 'other'),
                    notes=img_data.get('notes', ''),
                    uploaded_at=datetime.fromisoformat(img_data['uploaded_at'])
                )
            images_restored += 1

# Restore receipts for ALL jobs with receipts
if 'receipts' in job_data:
    for receipt_data in job_data['receipts']:
        # ... same structure for receipts ...
```

**Key Changes:**
- Images now restore at the job loop level (applies to all jobs)
- Removed duplicate code that was nested in the completed/approved condition
- Receipts also restored for all jobs (future-proof)

## File Changed

**Location**: `backend/apps/common/management/commands/reset_to_checkpoint.py`  
**Lines**: 543-576 (new image/receipt restoration code)  
**Status**: ✅ No linting errors

## How to Verify the Fix Works

### Step 1: Reload a Checkpoint
```powershell
cd backend
# Activate venv as per your setup
python manage.py reset_to_checkpoint --name latest
```

### Step 2: Check the Output
Look for this in the command output:
```
✅ Checkpoint restored!

📋 Jobs:
   - X jobs approved (ready for invoice)
   - Y jobs work_complete
   - Z jobs assigned
   - W jobs pending_assignment
   - ... work images restored       ← Should show number > 0
   - ... receipts restored          ← Should show number > 0
```

### Step 3: Verify in UI
1. Login as manager
2. Navigate to Jobs view
3. Look at job cards - you should see:
   - **Photo Samples** section with thumbnail images
   - **Before photos** on pending/assigned jobs
   - **After photos** + **receipts** on completed/approved jobs
4. Click any photo thumbnail
5. Full-screen carousel should open with navigation

### Step 4: Test the Carousel
- Click a thumbnail to open modal
- Use arrow keys or buttons to navigate
- Click thumbnail strip at bottom to jump to specific image
- Press ESC or click background to close
- All should work smoothly

## What About Completed/Approved Jobs?

Those still work perfectly:
- ✅ JobDetail records restore (hours, materials, work_description)
- ✅ Work images restore (completion photos)
- ✅ Receipts restore (expense documentation)
- ✅ Financial data displays correctly

## Impact

**Before Fix:**
- Manager creates checkpoint with 10 jobs (4 pending, 3 assigned, 2 approved, 1 invoiced)
- Restores checkpoint
- Result: Only approved/invoiced jobs show images (4 jobs have photos)

**After Fix:**
- Same scenario
- Restores checkpoint
- Result: ALL 10 jobs show their images including before photos on pending/assigned (10 jobs have photos)

## Technical Details

### What Gets Restored Now (for ALL jobs):

1. **Work Images** (`WorkImage` model)
   - Before/after photos from workers
   - Before photos from customer submissions
   - All image metadata (type, description, upload date)

2. **Receipts** (`Receipt` model)
   - Receipt images from expense tracking
   - Vendor info, amount, category
   - All receipt metadata

### Backward Compatibility

✅ Old checkpoints still work because:
- Code checks `if os.path.exists(src_path)` before creating records
- If image file missing, silently skips (no error)
- Completed/approved jobs with details still restore (same as before)
- Only NEW behavior: pending/assigned jobs now get images too

## Questions?

See related documentation:
- **Setup**: `docs/setup_and_testing/CHECKPOINT_SYSTEM_READY.md`
- **Troubleshooting**: `docs/core_technical_docs/TROUBLESHOOTING.md`
- **Lessons Learned**: `docs/development_history/lessons_learned.md` (section 14)




