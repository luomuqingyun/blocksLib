import os
import glob
import re

tests_dir = r'C:\Users\wofy\Desktop\embedblocks-studio\eb_compilation_tests'
failed_projects = []

for log_file in glob.glob(os.path.join(tests_dir, '*', 'test_build.log')):
    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        if '*** [' in content and 'Error' in content:
            project_name = os.path.basename(os.path.dirname(log_file))
            # Extract the first error message
            error_match = re.search(r'(error:.*|#error.*|undefined reference to.*)', content, re.IGNORECASE)
            err_msg = error_match.group(1).strip() if error_match else "Unknown error"
            failed_projects.append(f"{project_name}: {err_msg[:100]}")

for fp in failed_projects:
    print(fp)
