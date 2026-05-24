import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JUnit 4 to JUnit 5 Migration Guide for 2026',
  description:
    'Migrate a Java JUnit 4 test suite to JUnit 5 (Jupiter) in 2026. Annotations, assertions, parameterized tests, extensions, Mockito, and Gradle/Maven setup.',
  date: '2026-05-14',
  category: 'Migration',
  content: `
# JUnit 4 to JUnit 5 Migration Guide for 2026

JUnit 5 (Jupiter) was released in 2017. Eight years on, plenty of enterprise Java codebases still run JUnit 4 in production. The reasons are familiar: large suites, conservative tech leadership, dependence on JUnit 4 runners (\`PowerMock\`, \`SpringJUnit4ClassRunner\`), and a sense that "if it ain't broke, don't fix it." But JUnit 4 is in maintenance mode, the JUnit team is shipping Jupiter improvements quarterly, and modern Java features (records, sealed types, pattern matching) integrate more naturally with JUnit 5 than with the older runner.

This guide is the migration playbook for Java teams maintaining real JUnit 4 suites. We cover the annotation mapping, assertion translation, parameterized test pattern, the Rule-to-Extension shift, Mockito integration, Spring Boot test changes, Gradle and Maven configuration, the vintage engine bridge for incremental migration, and the gotchas that bite teams in week two.

For broader testing references, browse [the blog index](/blog). For Java testing skills, see the [QA Skills directory](/skills).

## Why migrate from JUnit 4 to JUnit 5

Four reasons. First, parameterized tests in JUnit 5 are vastly better. The \`@ParameterizedTest\` plus \`@MethodSource\` / \`@CsvSource\` pattern is more concise and supports more data sources than JUnit 4's \`@RunWith(Parameterized.class)\`. Second, extensions: \`@ExtendWith\` replaces the limited Rules and Runners with a unified extension model that composes cleanly. Third, lambda assertions: \`assertThrows(Exception.class, () -> {...})\` reads better than \`@Test(expected = Exception.class)\` and supports asserting on the thrown exception. Fourth, modern Java features: nested test classes (\`@Nested\`), dynamic tests, and parameter injection are first-class in Jupiter.

The fifth, indirect reason: most modern Java tools assume JUnit 5. Spring Boot 3+, Quarkus, Micronaut, and TestContainers all default to Jupiter. New tutorials, Stack Overflow answers, and library docs reference JUnit 5. Staying on JUnit 4 is increasingly out of sync with the ecosystem.

## Conceptual model: similar with sharper edges

JUnit 4 and JUnit 5 share the test-method-with-annotation model. The differences are in the annotations themselves (\`@Before\` vs \`@BeforeEach\`), the assertion API (static methods, lambda support), the extension model (Rules and Runners become Extensions), and the runtime architecture (JUnit 5 has separate API, engine, and platform).

The migration is mostly mechanical. The hardest parts are custom Rules and Runners; everything else is a translation table.

## Annotation mapping table

| JUnit 4 | JUnit 5 (Jupiter) | Notes |
|---|---|---|
| \`@Test\` | \`@Test\` | Different package: \`org.junit.jupiter.api.Test\` |
| \`@Before\` | \`@BeforeEach\` | Renamed |
| \`@After\` | \`@AfterEach\` | Renamed |
| \`@BeforeClass\` | \`@BeforeAll\` | Renamed, must be static |
| \`@AfterClass\` | \`@AfterAll\` | Renamed, must be static |
| \`@Ignore\` | \`@Disabled\` | Renamed |
| \`@Test(expected = E.class)\` | \`assertThrows(E.class, () -> ...)\` | Lambda assertion |
| \`@Test(timeout = 1000)\` | \`@Timeout(1)\` or \`assertTimeout(...)\` | Annotation or assertion |
| \`@Category(...)\` | \`@Tag("...")\` | Renamed |
| \`@RunWith(...)\` | \`@ExtendWith(...)\` | Extensions, not runners |
| \`@Rule\` | \`@ExtendWith\` (Extension) | Major refactor |
| \`@Parameters\` (Parameterized) | \`@ParameterizedTest\` + source | Cleaner |
| \`@Theory\` (Theories) | \`@ParameterizedTest\` | Closest equivalent |

## Assertion mapping table

| JUnit 4 (\`Assert\`) | JUnit 5 (\`Assertions\`) | Notes |
|---|---|---|
| \`assertEquals(expected, actual)\` | Same | Note arg order is unchanged |
| \`assertNotEquals(a, b)\` | Same | |
| \`assertTrue(condition)\` | Same | |
| \`assertFalse(condition)\` | Same | |
| \`assertNull(value)\` | Same | |
| \`assertNotNull(value)\` | Same | |
| \`assertThat(...)\` (Hamcrest) | Not built in; use AssertJ or Hamcrest as separate dep | |
| \`@Test(expected = E.class)\` | \`assertThrows(E.class, () -> ...)\` | Lambda |
| \`fail()\` | Same | |
| Message-first overloads | Message-last overloads | Argument order changed |

Important: JUnit 4 uses \`assertEquals(message, expected, actual)\` (message first). JUnit 5 uses \`assertEquals(expected, actual, message)\` (message last). A scripted find-and-replace must account for this.

## Step-by-step migration plan

1. **Week 0** - Add JUnit 5 dependencies alongside JUnit 4 using the vintage engine bridge.
2. **Week 1** - Update Gradle/Maven to run both engines. All existing tests still pass.
3. **Weeks 2 to 3** - Convert one package per developer per day. Run the suite after each conversion.
4. **Week 4** - Address custom Rules. Rewrite as Extensions.
5. **Week 5** - Remove the vintage engine bridge and JUnit 4 dependencies.

## Gradle and Maven setup

**Maven** (\`pom.xml\`):

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
  </dependency>
  <!-- Optional: vintage engine to run JUnit 4 tests alongside JUnit 5 -->
  <dependency>
    <groupId>org.junit.vintage</groupId>
    <artifactId>junit-vintage-engine</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.2.5</version>
    </plugin>
  </plugins>
</build>
\`\`\`

**Gradle** (\`build.gradle.kts\`):

\`\`\`kotlin
dependencies {
  testImplementation(platform("org.junit:junit-bom:5.11.0"))
  testImplementation("org.junit.jupiter:junit-jupiter")
  testRuntimeOnly("org.junit.vintage:junit-vintage-engine") // for JUnit 4 tests
}
tasks.test {
  useJUnitPlatform()
}
\`\`\`

## Before and after: a real test class

**JUnit 4 (before)**

\`\`\`java
import org.junit.*;
import static org.junit.Assert.*;

public class UserServiceTest {
  private UserService service;

  @Before
  public void setUp() {
    service = new UserService(new MockRepo());
  }

  @After
  public void tearDown() {
    service = null;
  }

  @Test
  public void findByIdReturnsUser() {
    User user = service.findById(1);
    assertNotNull(user);
    assertEquals("Alice", user.getName());
  }

  @Test(expected = NotFoundException.class)
  public void findByIdThrowsWhenMissing() {
    service.findById(999);
  }

  @Ignore("flaky on CI")
  @Test
  public void disabledTest() {
    fail("should not run");
  }
}
\`\`\`

**JUnit 5 (after)**

\`\`\`java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class UserServiceTest {
  private UserService service;

  @BeforeEach
  void setUp() {
    service = new UserService(new MockRepo());
  }

  @AfterEach
  void tearDown() {
    service = null;
  }

  @Test
  void findByIdReturnsUser() {
    User user = service.findById(1);
    assertNotNull(user);
    assertEquals("Alice", user.getName());
  }

  @Test
  void findByIdThrowsWhenMissing() {
    assertThrows(NotFoundException.class, () -> service.findById(999));
  }

  @Disabled("flaky on CI")
  @Test
  void disabledTest() {
    fail("should not run");
  }
}
\`\`\`

Notice three changes. First, the imports use \`org.junit.jupiter.api.*\`. Second, classes and methods do not need to be \`public\` in JUnit 5. Third, \`@Test(expected = ...)\` becomes \`assertThrows\` with a lambda.

## Parameterized tests

JUnit 4's parameterized tests required a separate runner and a complex \`@Parameters\` method. JUnit 5 introduces a much cleaner pattern.

**JUnit 4 (before)**

\`\`\`java
@RunWith(Parameterized.class)
public class CalculatorTest {
  private final int a;
  private final int b;
  private final int expected;

  public CalculatorTest(int a, int b, int expected) {
    this.a = a;
    this.b = b;
    this.expected = expected;
  }

  @Parameters
  public static Collection<Object[]> data() {
    return Arrays.asList(new Object[][] {
      {1, 2, 3}, {2, 3, 5}, {0, 0, 0},
    });
  }

  @Test
  public void add() {
    assertEquals(expected, new Calculator().add(a, b));
  }
}
\`\`\`

**JUnit 5 (after)**

\`\`\`java
class CalculatorTest {
  @ParameterizedTest
  @CsvSource({"1, 2, 3", "2, 3, 5", "0, 0, 0"})
  void add(int a, int b, int expected) {
    assertEquals(expected, new Calculator().add(a, b));
  }
}
\`\`\`

Other sources: \`@ValueSource\` for single-value lists, \`@MethodSource\` for complex data, \`@EnumSource\` for enums, \`@CsvFileSource\` for external CSV.

## Rules to Extensions

JUnit 4 Rules (\`@Rule TemporaryFolder folder = new TemporaryFolder();\`) become JUnit 5 Extensions.

| JUnit 4 Rule | JUnit 5 Extension |
|---|---|
| \`TemporaryFolder\` | Built-in \`@TempDir\` parameter injection |
| \`ExpectedException\` | \`assertThrows\` |
| \`Timeout\` | \`@Timeout\` |
| \`ExternalResource\` | Custom Extension implementing \`BeforeEachCallback\` |
| \`MockitoJUnitRunner\` | \`@ExtendWith(MockitoExtension.class)\` |
| Spring \`SpringJUnit4ClassRunner\` | \`@ExtendWith(SpringExtension.class)\` (or \`@SpringBootTest\`) |

\`\`\`java
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;

class FileTest {
  @TempDir Path tempDir; // auto-injected

  @Test
  void writesToTempDir() throws IOException {
    Path file = tempDir.resolve("test.txt");
    Files.writeString(file, "hello");
    assertEquals("hello", Files.readString(file));
  }
}
\`\`\`

## Mockito integration

Mockito works with both JUnit versions. JUnit 5 uses \`@ExtendWith(MockitoExtension.class)\` instead of \`@RunWith(MockitoJUnitRunner.class)\`.

\`\`\`java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock UserRepo repo;
  @InjectMocks UserService service;

  @Test
  void findByIdDelegates() {
    when(repo.findById(1)).thenReturn(Optional.of(new User("Alice")));
    assertEquals("Alice", service.findById(1).getName());
  }
}
\`\`\`

## Spring Boot integration

Spring Boot 3+ defaults to JUnit 5. \`@SpringBootTest\` auto-applies \`SpringExtension\`. If you are still on Spring Boot 2.x with JUnit 4, the migration includes switching to JUnit 5 Spring annotations.

\`\`\`java
@SpringBootTest
@AutoConfigureMockMvc
class WebControllerTest {
  @Autowired MockMvc mvc;

  @Test
  void getReturnsOk() throws Exception {
    mvc.perform(get("/api/users"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.length()").value(3));
  }
}
\`\`\`

## Nested tests and dynamic tests

JUnit 5 introduces two features that have no JUnit 4 equivalent.

\`\`\`java
class CalculatorTest {
  @Nested
  class Addition {
    @Test void positives() { assertEquals(5, new Calculator().add(2, 3)); }
    @Test void negatives() { assertEquals(-5, new Calculator().add(-2, -3)); }
  }

  @Nested
  class Division {
    @Test void byZeroThrows() {
      assertThrows(ArithmeticException.class, () -> new Calculator().divide(1, 0));
    }
  }
}

@TestFactory
Stream<DynamicTest> dynamicTests() {
  return Stream.of(1, 2, 3).map(n ->
    DynamicTest.dynamicTest("square of " + n, () ->
      assertEquals(n * n, square(n))));
}
\`\`\`

## Gotchas and breaking changes

1. **Imports change.** \`org.junit\` becomes \`org.junit.jupiter.api\`.
2. **Test classes and methods no longer need \`public\`.** Package-private is the norm.
3. **\`@BeforeClass\` becomes \`@BeforeAll\`; must be static.** Or use \`@TestInstance(PER_CLASS)\` to allow non-static.
4. **Argument order in assertions reverses for messages.** Auto-fix scripts must account.
5. **Rules become Extensions.** Custom rules require a refactor.
6. **\`@Category\` becomes \`@Tag\`.** Different annotation, similar idea.
7. **Mockito uses \`@ExtendWith(MockitoExtension.class)\` not \`@RunWith\`.**
8. **Spring uses \`@ExtendWith(SpringExtension.class)\`.** Or use \`@SpringBootTest\` shortcut.
9. **PowerMock has limited JUnit 5 support.** Refactor to remove PowerMock or stay on JUnit 4 for those tests.
10. **Vintage engine runs both engines side by side.** Use it for gradual migration.

## Migration checklist

- [ ] Add JUnit 5 BOM and dependencies to Gradle/Maven.
- [ ] Add vintage engine for JUnit 4 compatibility during migration.
- [ ] Update imports package by package.
- [ ] Translate annotations (\`@Before\` to \`@BeforeEach\`, etc.).
- [ ] Translate \`@Test(expected = ...)\` to \`assertThrows\`.
- [ ] Fix assertion argument order for messaged overloads.
- [ ] Rewrite custom Rules as Extensions.
- [ ] Update Mockito integration to \`MockitoExtension\`.
- [ ] Update Spring integration to \`SpringExtension\` or \`@SpringBootTest\`.
- [ ] Migrate parameterized tests to \`@ParameterizedTest\`.
- [ ] Remove vintage engine and JUnit 4 dependencies.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your suite depends heavily on PowerMock or another framework with limited JUnit 5 support, audit the rewrite cost before committing. Otherwise migrate; JUnit 4 will eventually stop receiving security patches.

## Conclusion and next steps

The JUnit 4 to JUnit 5 migration is overdue for most enterprise Java suites. The vintage engine lets you migrate incrementally without freezing development. Modern Java features and library integrations all assume JUnit 5 in 2026.

Start by adding both engines side by side. Convert one package at a time. Train the team on parameterized tests, nested test classes, and extensions last; those features are the migration's biggest UX wins.

Next read: explore the [QA Skills directory](/skills) for Java testing skills, and the [blog index](/blog) for Spring Boot and Mockito guides.
`,
};
