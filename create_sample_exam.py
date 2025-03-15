#!/usr/bin/env python3
import os
try:
    from fpdf import FPDF
except ImportError:
    print("FPDF not installed. Installing...")
    import subprocess
    subprocess.check_call(["pip", "install", "fpdf"])
    from fpdf import FPDF

# Ensure the exams directory exists
exams_dir = "/home/runner/workspace/MedBotAI/exams"
os.makedirs(exams_dir, exist_ok=True)

# Create a PDF document
pdf = FPDF()
pdf.add_page()
pdf.set_font('Arial', 'B', 16)
pdf.cell(40, 10, '2P03 Data Structures Midterm Exam')
pdf.ln(15)

# Add exam content
pdf.set_font('Arial', '', 12)
pdf.multi_cell(0, 10, 'Q1. What is the time complexity of a binary search algorithm? (10 points)')
pdf.multi_cell(0, 10, 'Answer: O(log n)')
pdf.ln(5)

pdf.multi_cell(0, 10, 'Q2. Explain the difference between a stack and a queue. (10 points)')
pdf.multi_cell(0, 10, 'Answer: A stack follows LIFO (Last In First Out) principle where elements are added and removed from the same end, while a queue follows FIFO (First In First Out) where elements are added at one end and removed from the other.')
pdf.ln(5)

pdf.multi_cell(0, 10, 'Q3. What is a hash collision and how can it be resolved? (15 points)')
pdf.multi_cell(0, 10, 'Answer: A hash collision occurs when two different keys produce the same hash value. It can be resolved using techniques like chaining (using linked lists), open addressing (linear probing, quadratic probing), or double hashing.')
pdf.ln(5)

pdf.multi_cell(0, 10, 'Q4. Describe the worst-case time complexity of quicksort and when it occurs. (15 points)')
pdf.multi_cell(0, 10, 'Answer: The worst-case time complexity of quicksort is O(n²), which occurs when the pivot chosen is always the smallest or largest element, resulting in highly unbalanced partitions.')
pdf.ln(5)

pdf.multi_cell(0, 10, 'Q5. Implement a function to check if a binary tree is balanced. (20 points)')
pdf.multi_cell(0, 10, 'Answer: A balanced binary tree is one where the height of the left and right subtrees of any node differ by no more than 1. We can implement a recursive function that calculates the height of each subtree and checks for balance condition at each node.')

# Save the PDF
output_path = os.path.join(exams_dir, 'sample_exam.pdf')
pdf.output(output_path, 'F')
print(f'Sample exam PDF created at {output_path}') 