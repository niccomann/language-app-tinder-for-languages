import logging
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

log = logging.getLogger(__name__)


class ServerSettings(BaseSettings):
    """Server configuration settings"""
    env: str = Field(default="dev", pattern="^(dev|prod)$")
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR)$")
    host: str = "0.0.0.0"
    port: str = "8500"

    model_config = {
        "env_prefix": "",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""
    host: str = "localhost"
    port: str = "5432"
    user: str = "postgres"
    password: str = "postgres"
    db_schema: str = Field(default="public", alias="db_schema")
    database: str = "tinder_languages"
    recreate_db: bool = Field(default=False, validation_alias="RECREATE_DB")
    use_sqlite: bool = Field(default=False, validation_alias="USE_SQLITE")

    model_config = {
        "env_prefix": "db_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    @property
    def url(self) -> str:
        """Generate database URL for SQLAlchemy"""
        if self.use_sqlite:
            log.info("Using SQLite database (in-memory or file)")
            return "sqlite:///./app.db"
        
        log.debug(f"Building DB URL - Components check:")
        log.debug(f"  - host: '{self.host}' (type: {type(self.host).__name__})")
        log.debug(f"  - port: '{self.port}' (type: {type(self.port).__name__})")
        log.debug(f"  - user: '{self.user}' (type: {type(self.user).__name__})")
        log.debug(f"  - database: '{self.database}' (type: {type(self.database).__name__})")
        
        try:
            url = f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
            log.debug(f"DB URL constructed successfully")
            return url
        except TypeError as e:
            log.error(f"CRITICAL: Failed to construct database URL due to type mismatch: {e}")
            log.error(f"This typically means one of the components is an int instead of str")
            raise


class Config(BaseSettings):
    """Main application configuration"""
    server: ServerSettings
    database: DatabaseConfig

    def __init__(self, **kwargs):
        # Initialize nested settings
        if "database" not in kwargs:
            kwargs["database"] = DatabaseConfig()
        if "server" not in kwargs:
            kwargs["server"] = ServerSettings()
        
        super().__init__(**kwargs)
        self.__configure_logging()
        
        # Log configuration values
        log.info("=" * 60)
        log.info("CONFIGURATION LOADED")
        log.info("=" * 60)
        log.info("Server Configuration:")
        log.info(f"  - port: '{self.server.port}' (type: {type(self.server.port).__name__})")
        log.info(f"  - host: '{self.server.host}' (type: {type(self.server.host).__name__})")
        log.info(f"  - env: '{self.server.env}' (type: {type(self.server.env).__name__})")
        log.info("")
        log.info("Database Configuration:")
        log.info(f"  - host: '{self.database.host}' (type: {type(self.database.host).__name__})")
        log.info(f"  - port: '{self.database.port}' (type: {type(self.database.port).__name__})")
        log.info(f"  - schema: '{self.database.db_schema}' (type: {type(self.database.db_schema).__name__})")
        log.info(f"  - user: '{self.database.user}' (type: {type(self.database.user).__name__})")
        log.info(f"  - database: '{self.database.database}' (type: {type(self.database.database).__name__})")
        log.info("=" * 60)

    def __configure_logging(self) -> None:
        """Configure logging based on log level setting"""
        log_level_definition = self.server.log_level
        log_level_int = logging.INFO
        
        match log_level_definition:
            case "DEBUG":
                log_level_int = logging.DEBUG
            case "WARNING":
                log_level_int = logging.WARNING
            case "ERROR":
                log_level_int = logging.ERROR
        
        logging.basicConfig(
            level=log_level_int,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )


config = Config()
