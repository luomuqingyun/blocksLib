import os
import glob
import re

tests_dir = r'C:\Users\wofy\Desktop\embedblocks-studio\eb_compilation_tests'
groups = {}

for log_file in glob.glob(os.path.join(tests_dir, '*', 'test_build.log')):
    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        if '*** [' in content and 'Error' in content:
            project_name = os.path.basename(os.path.dirname(log_file))
            # Extract the first error message
            m = re.search(r'(error:.*|#error.*|undefined reference to.*)', content, re.IGNORECASE)
            err_msg = m.group(1).strip() if m else "Unknown error"
            
            # clean up err_msg
            err_msg = err_msg.split('\n')[0].replace('\r', '').strip()
            
            # prefix group
            prefix = project_name.replace('test_generic_stm32', '').replace('test_', '')[:2]
            if prefix not in groups:
                groups[prefix] = []
            groups[prefix].append((project_name, err_msg))

for prefix, items in sorted(groups.items()):
    print(f"--- Family {prefix} ---")
    print(f"{items[0][0]}: {items[0][1]}")
    if len(items) > 1:
        print(f"... and {len(items)-1} more")
