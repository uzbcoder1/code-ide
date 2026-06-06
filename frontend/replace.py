import glob

files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We replaced 'http://127.0.0.1:8000 with `${import.meta.env.VITE_API_URL}
    # This leaves strings like: `${import.meta.env.VITE_API_URL}/execute'
    # We need to change that trailing ' into a backtick `
    
    content = content.replace("`${import.meta.env.VITE_API_URL}/execute'", "`${import.meta.env.VITE_API_URL}/execute`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/register'", "`${import.meta.env.VITE_API_URL}/register`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/login'", "`${import.meta.env.VITE_API_URL}/login`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/users/me'", "`${import.meta.env.VITE_API_URL}/users/me`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/admin/users'", "`${import.meta.env.VITE_API_URL}/admin/users`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/admin/projects'", "`${import.meta.env.VITE_API_URL}/admin/projects`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/admin/logs'", "`${import.meta.env.VITE_API_URL}/admin/logs`")
    content = content.replace("`${import.meta.env.VITE_API_URL}/admin/stats'", "`${import.meta.env.VITE_API_URL}/admin/stats`")
    
    # Check for the delete endpoint which used backticks originally:
    # originally: `http://127.0.0.1:8000/admin/projects/${id}`
    # after script: `${import.meta.env.VITE_API_URL}/admin/projects/${id}`
    # Wait, the script replaced `http://127.0.0.1:8000` with `${import.meta.env.VITE_API_URL}`
    # So `http...` became `${...}` which is correct. Wait, the first replace was `'http...`
    # Let's fix delete specifically if it was corrupted:
    # If it was \`${import.meta.env.VITE_API_URL}/admin/projects/${id}\` it's fine.
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
