using System;
using System.Drawing;
using System.Linq;
using System.Reflection.Emit;
using System.Windows.Forms;
using WixToolset.Dtf.WindowsInstaller;

namespace ExtendedInstaller.UninstallForm
{
    internal class UninstallFormAction
    {
        public static ActionResult ShowUninstallDialog(Session session)
        {
            try
            {
                // Create and configure the form
                using (var form = new UninstallReasonForm())
                {
                    var result = form.ShowDialog();

                    if (result == DialogResult.OK)
                    {
                        // Store the reason in the MSI property
                        session["UNINSTALL_REASON"] = form.UninstallReason;
                    }
                    return ActionResult.Success;
                }
            }
            catch (Exception ex)
            {
                session.Log($"Error in UninstallReasonDialog: {ex.Message}");
                return ActionResult.Success;
            }
        }
    }

    internal class UninstallReasonForm : Form
    {
        private Panel mainPanel;
        private RadioButton[] reasonRadioButtons;
        private Button nextButton;
        private System.Windows.Forms.Label headerLabel;
        public string UninstallReason { get; private set; }

        private readonly string[] reasons = new[]
        {
            "The app is too difficult to use",
            "The app is not working correctly or performance is slow",
            "The app does not fit my needs",
            "Other"
        };

        public UninstallReasonForm()
        {
            InitializeComponents();
            ApplyStyles();
        }

        private void InitializeComponents()
        {
            // Form settings
            this.Text = "Uninstall Feedback";
            this.Width = 580;
            this.Height = 380;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            mainPanel = new Panel
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(mainPanel);

            // Header with adjusted positioning
            headerLabel = new System.Windows.Forms.Label
            {
                Text = "Please tell us why you're uninstalling Airtime",
                Font = new Font("Segoe UI", 14, FontStyle.Regular),
                ForeColor = Color.FromArgb(51, 51, 51),
                AutoSize = true,
                Location = new Point(30, 20),
                FlatStyle = FlatStyle.System //Removes internal padding added by .NET
            };
            mainPanel.Controls.Add(headerLabel);

            var radioPanel = new Panel
            {
                Location = new Point(30, 80),
                Width = 540,
                Height = 160,
                AutoScroll = true,
            };
            mainPanel.Controls.Add(radioPanel);

            reasonRadioButtons = new RadioButton[reasons.Length];
            for (int i = 0; i < reasons.Length; i++)
            {
                reasonRadioButtons[i] = new RadioButton
                {
                    Text = reasons[i],
                    Location = new Point(0, i * 40), 
                    Width = 480, 
                    Height = 32,
                    Font = new Font("Segoe UI", 11, FontStyle.Regular),
                    ForeColor = Color.FromArgb(51, 51, 51),
                };
                radioPanel.Controls.Add(reasonRadioButtons[i]);
            }
            

            nextButton = new Button
            {
                Text = "Next",
                Location = new Point(427, 285),
                Width = 100,
                Height = 32,
                DialogResult = DialogResult.OK,
                Font = new Font("Segoe UI", 11)
            };
            nextButton.Click += NextButton_Click;
            mainPanel.Controls.Add(nextButton);

            // Due to limited control over MSI-spawned windows and their visibility,
            // setting this window as OnTop ensures proper user interaction with
            // the uninstall form while maintaining a safe exit path through
            // standard UI controls.
            this.TopMost = true;
        }

        private void ApplyStyles()
        {
            // Form background
            this.BackColor = Color.White;

            // Button styling
            nextButton.FlatStyle = FlatStyle.Flat;
            nextButton.BackColor = Color.FromArgb(121, 221, 232);
            nextButton.ForeColor = Color.Black;
            nextButton.FlatAppearance.BorderSize = 0;
            nextButton.Cursor = Cursors.Hand;

            // Add hover effect to radio buttons
            foreach (var rb in reasonRadioButtons)
            {
                rb.Cursor = Cursors.Hand;
            }
        }

        private void NextButton_Click(object sender, EventArgs e)
        {
            var selectedReason = reasonRadioButtons.FirstOrDefault(rb => rb.Checked);

            if (selectedReason != null)
            {
                UninstallReason = selectedReason.Text;
            }
            else
            {
                UninstallReason = "not set";
            }
        }
    }
}
