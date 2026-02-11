import { validateSkillFile } from './index';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: qaskills-validate <path-to-SKILL.md>');
    console.log('');
    console.log('Validates a SKILL.md file for the QA Skills directory.');
    console.log('');
    console.log('Options:');
    console.log('  --json    Output results as JSON');
    console.log('  --help    Show this help message');
    process.exit(0);
  }

  const filePath = args.find((a) => !a.startsWith('--'))!;
  const jsonOutput = args.includes('--json');

  try {
    const result = await validateSkillFile(filePath);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
      return;
    }

    // Pretty output
    if (result.valid) {
      console.log('\x1b[32m✓\x1b[0m SKILL.md is valid');
    } else {
      console.log('\x1b[31m✗\x1b[0m SKILL.md has validation errors');
    }

    console.log('');
    console.log(`Quality Score: ${result.qualityScore}/100`);
    console.log(`  Schema:        ${result.qualityBreakdown.schema}/30`);
    console.log(`  Documentation: ${result.qualityBreakdown.documentation}/30`);
    console.log(`  Completeness:  ${result.qualityBreakdown.completeness}/25`);
    console.log(`  Freshness:     ${result.qualityBreakdown.freshness}/15`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('\x1b[31mErrors:\x1b[0m');
      for (const err of result.errors) {
        console.log(`  \x1b[31m✗\x1b[0m ${err.field}: ${err.message}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('');
      console.log('\x1b[33mWarnings:\x1b[0m');
      for (const warn of result.warnings) {
        console.log(`  \x1b[33m⚠\x1b[0m ${warn.field}: ${warn.message}`);
      }
    }

    process.exit(result.valid ? 0 : 1);
  } catch (e) {
    console.error(`\x1b[31mError:\x1b[0m ${e instanceof Error ? e.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main();
