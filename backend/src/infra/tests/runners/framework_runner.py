from infra.tests.runners.pyrit_runner import PyritRunner
from infra.tests.runners.garak_runner import GarakRunner


class FrameworkRunner:

    def run(self, test):

        pyrit = PyritRunner()
        garak = GarakRunner()

        pyrit_results = pyrit.run(test)
        garak_results = garak.run(test)

        return {
            "pyrit": pyrit_results,
            "garak": garak_results,
        }