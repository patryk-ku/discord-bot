import os
from PIL import Image
import sys

print('Start of collage generator script...')
# Parse id argument
fileId = sys.argv[1]
print('Collage ID: ' + fileId)

# Tmp files path
folder_path = './tmpfiles'

# Photo list
# jpg_files = [f for f in os.listdir(folder_path) if f.endswith('.jpg')]
jpg_files = [f for f in os.listdir(folder_path) if f.startswith(fileId)]
print('Creating collage from files: ')
print(*jpg_files, sep = "\n")

# Image properties
collage_width = 900
collage_height = 900
num_cols = 3
num_rows = 3

# Single image res
# photo_width = int(collage_width / num_cols)
# photo_height = int(collage_height / num_rows)

photo_width = 300
photo_height = 300


collage_image = Image.new('RGB', (collage_width, collage_height))

# tmp fix:
x = 0
y = 0
index = 0
for i in range(num_cols):
	for j in range(num_rows):
		# index = i * num_cols + j

		# Open file
		# image_path = os.path.join(folder_path, jpg_files[index])
		image_path = './tmpfiles/' + str(fileId) + '-' + str(index) + '.jpg'
		if os.path.exists(image_path):
			image = Image.open(image_path)

			# Resize
			# image = image.resize((photo_width, photo_height))

			# Insert image
			# x = i * photo_width
			# y = j * photo_height
			collage_image.paste(image, (x, y))
		x += 300
		if x == 900:
			x = 0
			y += 300
		index += 1

output_path = './tmpfiles/' + fileId + '-collage.jpg'
collage_image.save(output_path)
print('File created: ' + output_path)