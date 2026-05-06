import subprocess
import sys
import textwrap
import os


def test_backend_models_import_without_pydantic_warning_debt():
    script = textwrap.dedent(
        """
        import warnings
        from pydantic.warnings import PydanticDeprecatedSince20

        warnings.simplefilter("error", PydanticDeprecatedSince20)
        warnings.simplefilter("error", UserWarning)

        import app.models
        import app.database.models
        import app.routes.grammar
        import app.routes.statistics
        """
    )

    env = {**os.environ, "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", "test-key")}
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 0, result.stderr
