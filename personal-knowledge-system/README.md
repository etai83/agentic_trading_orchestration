# Personal Knowledge System

Catalog notes, project docs, and other eligible text files so they can be found and used quickly.

```bash
python -m knowledge_system /path/to/root "search terms"
python -m knowledge_system /path/to/root --list
python -m knowledge_system /path/to/root --list --kind note
python -m knowledge_system /path/to/root --list --group Inbox
```

Vendor and VCS trees (`node_modules`, `.git`, `__pycache__`), binaries, and other non-knowledge junk are skipped.

## Tests

```bash
python -m pytest
```
