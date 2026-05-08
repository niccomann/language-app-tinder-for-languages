from sqlalchemy import inspect
from sqlmodel import Session

from app.core.config import config


def database_table_exists(session: Session, table_name: str) -> bool:
    inspector = inspect(session.get_bind())
    if inspector.has_table(table_name):
        return True

    schema = None if session.get_bind().dialect.name == "sqlite" else config.database.db_schema
    return bool(schema and inspector.has_table(table_name, schema=schema))


def database_column_exists(session: Session, table_name: str, column_name: str) -> bool:
    if not database_table_exists(session, table_name):
        return False

    inspector = inspect(session.get_bind())
    schema = None if session.get_bind().dialect.name == "sqlite" else config.database.db_schema
    try:
        columns = inspector.get_columns(table_name, schema=schema)
    except Exception:
        columns = inspector.get_columns(table_name)
    return any(column["name"] == column_name for column in columns)
