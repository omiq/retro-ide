# API Directory

This directory contains server-side API endpoints for the 8bitworkshop IDE.

## KickAss Assembler API

### Endpoint
`/api/kickass/compile.php`

### Requirements
- PHP 7.0 or higher
- Java runtime (for executing KickAss.jar)
- KickAss.jar must be available at `/home/ide/htdocs/KickAss.jar` or in the project root

### Testing
After deployment, test the API using:
- Browser: `https://ide.retrogamecoders.com/test_kickass_api.php`
- Or use curl/Postman to POST JSON to `/api/kickass/compile.php`

### Server Configuration
- Ensure PHP execution is enabled for `.php` files
- Ensure Java is installed and accessible via `java` command
- Ensure `/tmp/kickass-*` directories can be created (for temporary compilation files)

See `docs/KICKASS_API_SPEC.md` for full API documentation.

