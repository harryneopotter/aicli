// G:\AI\Repo\tools\aicli\warp-cli\src\services\analysis.service.ts

import { ESLint } from "eslint";
import * as securityPlugin from "eslint-plugin-security";
import { Project, FunctionDeclaration, MethodDeclaration } from "ts-morph";

export interface AnalysisResult {
  file: string;
  line: number;
  message: string;
  severity: "High" | "Medium" | "Low";
}

export class CodeAnalysisService {
  private eslint: ESLint;

  constructor() {
    const securityConfig =
      (securityPlugin as { configs?: { recommended?: ESLint.ConfigData } })
        .configs?.recommended ?? {};
    this.eslint = new ESLint({
      useEslintrc: false,
      plugins: {
        security: securityPlugin,
      },
      overrideConfig: {
        plugins: ["security"],
        parser: "@typescript-eslint/parser",
        parserOptions: {
          ecmaVersion: 2021,
          sourceType: "module",
        },
        rules: securityConfig.rules ?? {},
      },
    });
  }

  async analyzeSecurity(targetPath: string): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    const lintResults = await this.eslint.lintFiles([targetPath]);

    for (const result of lintResults) {
      for (const message of result.messages) {
        results.push({
          file: result.filePath,
          line: message.line,
          message: message.message,
          severity: message.severity === 2 ? "High" : "Medium",
        });
      }
    }

    return results;
  }

  analyzeComplexity(targetPath: string): AnalysisResult[] {
    const project = new Project();
    project.addSourceFilesAtPaths(targetPath);
    const sourceFiles = project.getSourceFiles();
    const results: AnalysisResult[] = [];

    for (const sourceFile of sourceFiles) {
      const functions = [
        ...sourceFile.getFunctions(),
        ...sourceFile.getClasses().flatMap((cls) => cls.getMethods()),
      ];

      functions.forEach((func) => {
        const complexity = this.calculateCyclomaticComplexity(func);
        if (complexity > 10) {
          const functionName = func.getName() || "anonymous";
          results.push({
            file: sourceFile.getFilePath(),
            line: func.getStartLineNumber(),
            message: `High cyclomatic complexity (${complexity}) in function '${functionName}'`,
            severity: "High",
          });
        }
      });
    }

    return results;
  }

  private calculateCyclomaticComplexity(
    func: FunctionDeclaration | MethodDeclaration,
  ): number {
    const bodyText = func.getBodyText() || "";
    const decisionRegex = /(if|for|while|case|catch|\?|\&\&|\|\|)/g;
    const matches = bodyText.match(decisionRegex);

    return 1 + (matches ? matches.length : 0);
  }
}

export const analysisService = new CodeAnalysisService();
