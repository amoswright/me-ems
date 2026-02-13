
#!/bin/bash

# A script to rename files by incrementing the number in the filename by one.
# It assumes file names have a clear numerical part, e.g., 'file1.txt', 'img005.jpg'.

# 1. List files, sort numerically in reverse, and loop through them.
# The 'sort -rn' command sorts numerically in reverse order (highest number first).
for f in $(ls * | sort -rn); do

  # Extract the number part from the filename.
  # This example assumes the number is the entire numerical part of the filename before any extension.
  # You might need to adjust the regex based on your specific filenames.
  num=$(echo "$f" | grep -o -E '[0-9]+' | head -n 1)

  # Check if a number was found
  if [ -n "$num" ]; then
    # Calculate the new number (increment by one)
    new_num=$((num + 1))

    # Construct the new filename by replacing the old number with the new number
    # This uses bash string substitution: ${f/$num/$new_num}
    new_f=${f/$num/$new_num}

    # Rename the file
    mv -- "$f" "$new_f"
    echo "Renamed '$f' to '$new_f'"
  fi
done
